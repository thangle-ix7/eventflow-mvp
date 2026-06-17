package com.eventflow.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eventflow.backend.dto.*;
import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private static final String FREE_PLAN_CODE = "FREE";
    private static final int AI_CREDIT_COST_PER_REQUEST = 1;

    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final EventPassRepository eventPassRepository;
    private final AiCreditLedgerRepository aiCreditLedgerRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final TaskAttachmentRepository taskAttachmentRepository;
    private final TaskReportRepository taskReportRepository;
    private final UserRepository userRepository;
    private final PayOsPaymentService payOsPaymentService;
    private final ObjectMapper objectMapper;

    @Value("${eventflow.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional(readOnly = true)
    public List<SubscriptionPlanDTO> getPlans() {
        return subscriptionPlanRepository.findAllByOrderByPriorityRankAsc().stream()
                .map(this::mapPlan)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubscriptionOverviewDTO getUserOverview(Long userId) {
        ActiveSubscription active = resolveActiveSubscription(userId);
        List<Long> activeEventIds = eventRepository.findActiveNormalEventIdsLedByUser(userId);
        long activeEvents = activeEventIds.size();
        long maxMembers = maxMembersUsed(activeEventIds);
        long maxStorageBytes = maxStorageUsed(activeEventIds);
        int usedCredits = subscriptionCreditsUsed(userId, active);
        Integer remainingCredits = remaining(active.plan().getAiCreditsPerMonth(), usedCredits, active.plan().isUnlimitedAi());
        List<String> limitWarnings = buildSubscriptionWarnings(active.plan(), activeEvents, maxMembers, maxStorageBytes, usedCredits);

        return SubscriptionOverviewDTO.builder()
                .plan(mapPlan(active.plan()))
                .status(active.status())
                .currentPeriodStart(active.periodStart())
                .currentPeriodEnd(active.periodEnd())
                .activeEventsUsed(activeEvents)
                .maxMembersUsedInLedEvents(maxMembers)
                .maxStorageBytesUsedInLedEvents(maxStorageBytes)
                .aiCreditsUsed(usedCredits)
                .aiCreditsRemaining(remainingCredits)
                .overLimit(!limitWarnings.isEmpty())
                .limitWarnings(limitWarnings)
                .source(active.source())
                .build();
    }

    @Transactional(readOnly = true)
    public EventEntitlementDTO getEventEntitlement(Long eventId) {
        EffectiveEventEntitlement entitlement = resolveEventEntitlement(eventId);
        int usedCredits = eventCreditsUsed(entitlement);
        Integer remainingCredits = remaining(eventAiCreditLimit(entitlement), usedCredits, entitlement.plan().isUnlimitedAi());

        return EventEntitlementDTO.builder()
                .plan(mapPlan(entitlement.plan()))
                .source(entitlement.source())
                .expiresAt(entitlement.expiresAt())
                .membersUsed(eventMemberRepository.countByEventId(eventId))
                .storageBytesUsed(storageUsedByEvent(eventId))
                .aiCreditsUsed(usedCredits)
                .aiCreditsRemaining(remainingCredits)
                .build();
    }

    @Transactional
    public CheckoutResponseDTO createCheckout(Long userId, CheckoutRequestDTO request) {
        SubscriptionPlan plan = subscriptionPlanRepository.findById(request.getPlanCode().trim().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói subscription"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        Event event = null;
        if (plan.getPlanType() == PlanType.EVENT_PASS) {
            if (request.getEventId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event Pass cần eventId");
            }
            event = eventRepository.findById(request.getEventId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));
            if (!eventMemberRepository.existsByEventIdAndUserIdAndRole(event.getId(), userId, UserRole.LEADER)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader mới được mua Event Pass cho sự kiện");
            }
        } else {
            validateSubscriptionPlanChange(userId, plan);
        }

        String changeType = resolveChangeType(userId, plan);
        if (plan.getPriceVnd() == null || plan.getPriceVnd() <= 0 || "CURRENT_PLAN".equals(changeType)) {
            return CheckoutResponseDTO.builder()
                    .provider("INTERNAL")
                    .status(CommercialStatus.ACTIVE.name())
                    .planCode(plan.getCode())
                    .amountVnd(plan.getPriceVnd())
                    .changeType(changeType)
                    .message(resolveCheckoutMessage(plan, changeType))
                    .build();
        }

        PaymentTransaction transaction = paymentTransactionRepository.save(PaymentTransaction.builder()
                .user(user)
                .event(event)
                .plan(plan)
                .amountVnd(plan.getPriceVnd())
                .provider("PAYOS")
                .status(CommercialStatus.PENDING)
                .build());
        transaction.setProviderOrderId(String.valueOf(transaction.getId()));
        PayOsPaymentService.PayOsCheckout checkout = payOsPaymentService.createPaymentLink(
                transaction,
                frontendUrl + "/pricing",
                frontendUrl + "/pricing",
                LocalDateTime.now());
        transaction.setCheckoutUrl(checkout.checkoutUrl());
        transaction.setProviderTransactionId(checkout.paymentLinkId());
        transaction.setRawPayload(checkout.rawPayload());
        paymentTransactionRepository.save(transaction);

        return CheckoutResponseDTO.builder()
                .transactionId(transaction.getId())
                .provider(transaction.getProvider())
                .status(transaction.getStatus().name())
                .planCode(plan.getCode())
                .amountVnd(plan.getPriceVnd())
                .checkoutUrl(transaction.getCheckoutUrl())
                .changeType(changeType)
                .message(resolveCheckoutMessage(plan, changeType))
                .build();
    }

    @Transactional
    public Map<String, String> handlePayOsWebhook(Map<String, Object> payload) {
        try {
            PaymentCallbackResult result = processPayOsWebhook(payload);
            if (!result.signatureValid()) {
                return Map.of("code", "97", "desc", "Invalid signature");
            }
            if (!result.orderFound()) {
                return Map.of("code", "01", "desc", "Order not found");
            }
            if (!result.amountValid()) {
                return Map.of("code", "04", "desc", "Invalid amount");
            }
            return Map.of("code", "00", "desc", result.message());
        } catch (Exception ex) {
            return Map.of("code", "99", "desc", "Unknown error");
        }
    }

    @Transactional(readOnly = true)
    public void assertCanCreateEvent(Long userId) {
        ActiveSubscription active = resolveActiveSubscription(userId);
        SubscriptionPlan plan = active.plan();
        if (plan.isUnlimitedEvents()) {
            return;
        }

        long currentActiveEvents = eventRepository.countActiveNormalEventsLedByUser(userId);
        Integer limit = plan.getMaxActiveEvents();
        if (limit != null && currentActiveEvents >= limit) {
            throw quotaExceeded("Gói " + plan.getDisplayName() + " chỉ cho phép tối đa " + limit + " sự kiện đang hoạt động");
        }
    }

    @Transactional(readOnly = true)
    public void assertCanAddMember(Long eventId) {
        EffectiveEventEntitlement entitlement = resolveEventEntitlement(eventId);
        SubscriptionPlan plan = entitlement.plan();
        if (plan.isUnlimitedUsers()) {
            return;
        }

        long currentMembers = eventMemberRepository.countByEventId(eventId);
        Integer limit = plan.getMaxUsersPerEvent();
        if (limit != null && currentMembers >= limit) {
            throw quotaExceeded("Gói " + plan.getDisplayName() + " chỉ cho phép tối đa " + limit + " người trong một sự kiện");
        }
    }

    @Transactional(readOnly = true)
    public void assertEventStorageAvailable(Long eventId, long newBytes) {
        if (newBytes <= 0) {
            return;
        }

        EffectiveEventEntitlement entitlement = resolveEventEntitlement(eventId);
        SubscriptionPlan plan = entitlement.plan();
        if (plan.isUnlimitedStorage()) {
            return;
        }

        Long limitBytes = plan.getStorageLimitBytes();
        if (limitBytes != null && storageUsedByEvent(eventId) + newBytes > limitBytes) {
            throw quotaExceeded("Dung lượng lưu trữ của gói " + plan.getDisplayName() + " đã vượt giới hạn");
        }
    }

    @Transactional
    public void consumeAiCredit(Long userId, Long eventId, String action) {
        EffectiveEventEntitlement eventEntitlement = resolveEventEntitlement(eventId);
        if (eventEntitlement.eventPass().isPresent()) {
            consumeEventPassCredit(userId, eventId, eventEntitlement, action);
            return;
        }

        consumeSubscriptionCredit(userId, eventId, action);
    }

    private void consumeEventPassCredit(Long userId, Long eventId, EffectiveEventEntitlement entitlement, String action) {
        SubscriptionPlan plan = entitlement.plan();
        if (!plan.isUnlimitedAi()) {
            int used = -aiCreditLedgerRepository.sumEventPassCredits(entitlement.eventPass().orElseThrow().getId());
            Integer limit = plan.getAiCreditsPerEvent();
            if (limit != null && used + AI_CREDIT_COST_PER_REQUEST > limit) {
                throw quotaExceeded("Event Pass " + plan.getDisplayName() + " đã hết AI credits");
            }
        }

        User user = userRepository.getReferenceById(userId);
        Event event = eventRepository.getReferenceById(eventId);
        EventPass eventPass = entitlement.eventPass().orElseThrow();
        aiCreditLedgerRepository.save(AiCreditLedger.builder()
                .user(user)
                .event(event)
                .eventPass(eventPass)
                .sourceType(AiCreditSourceType.EVENT_PASS)
                .planCode(plan.getCode())
                .creditsDelta(-AI_CREDIT_COST_PER_REQUEST)
                .action(action)
                .description("AI suggestion request")
                .build());
    }

    private void consumeSubscriptionCredit(Long userId, Long eventId, String action) {
        ActiveSubscription active = resolveActiveSubscription(userId);
        SubscriptionPlan plan = active.plan();
        if (!plan.isUnlimitedAi()) {
            int used = subscriptionCreditsUsed(userId, active);
            Integer limit = plan.getAiCreditsPerMonth();
            if (limit != null && used + AI_CREDIT_COST_PER_REQUEST > limit) {
                throw quotaExceeded("Gói " + plan.getDisplayName() + " đã hết AI credits trong kỳ này");
            }
        }

        aiCreditLedgerRepository.save(AiCreditLedger.builder()
                .user(userRepository.getReferenceById(userId))
                .event(eventRepository.getReferenceById(eventId))
                .sourceType(AiCreditSourceType.SUBSCRIPTION)
                .planCode(plan.getCode())
                .creditsDelta(-AI_CREDIT_COST_PER_REQUEST)
                .action(action)
                .description("AI suggestion request")
                .build());
    }

    private ActiveSubscription resolveActiveSubscription(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return userSubscriptionRepository.findActiveForUser(userId, CommercialStatus.ACTIVE, now).stream()
                .findFirst()
                .map(subscription -> new ActiveSubscription(
                        subscription.getPlan(),
                        subscription.getStatus().name(),
                        subscription.getCurrentPeriodStart(),
                        subscription.getCurrentPeriodEnd(),
                        "SUBSCRIPTION"))
                .orElseGet(() -> {
                    SubscriptionPlan freePlan = subscriptionPlanRepository.findById(FREE_PLAN_CODE)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu plan FREE"));
                    return new ActiveSubscription(
                            freePlan,
                            CommercialStatus.ACTIVE.name(),
                            monthStart(now),
                            monthStart(now).plusMonths(1),
                            "DEFAULT_FREE");
                });
    }

    private EffectiveEventEntitlement resolveEventEntitlement(Long eventId) {
        LocalDateTime now = LocalDateTime.now();
        Optional<EventPass> eventPass = eventPassRepository.findActiveForEvent(eventId, CommercialStatus.ACTIVE, now).stream()
                .findFirst();
        if (eventPass.isPresent()) {
            EventPass pass = eventPass.get();
            return new EffectiveEventEntitlement(pass.getPlan(), "EVENT_PASS", pass.getExpiresAt(), Optional.of(pass));
        }

        List<Long> leaderIds = eventMemberRepository.findLeaderUserIdsByEventId(eventId);
        if (leaderIds.isEmpty()) {
            return new EffectiveEventEntitlement(
                    subscriptionPlanRepository.findById(FREE_PLAN_CODE)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu plan FREE")),
                    "DEFAULT_FREE",
                    null,
                    Optional.empty());
        }

        List<UserSubscription> activeSubscriptions = userSubscriptionRepository.findActiveForUsers(leaderIds, CommercialStatus.ACTIVE, now);
        return activeSubscriptions.stream()
                .map(UserSubscription::getPlan)
                .max(Comparator.comparing(SubscriptionPlan::getPriorityRank))
                .map(plan -> new EffectiveEventEntitlement(plan, "LEADER_SUBSCRIPTION", null, Optional.<EventPass>empty()))
                .orElseGet(() -> new EffectiveEventEntitlement(
                        subscriptionPlanRepository.findById(FREE_PLAN_CODE)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu plan FREE")),
                        "DEFAULT_FREE",
                        null,
                        Optional.empty()));
    }

    private PaymentCallbackResult processPayOsWebhook(Map<String, Object> payload) {
        Object dataObject = payload.get("data");
        if (!(dataObject instanceof Map<?, ?> rawData)) {
            return new PaymentCallbackResult(
                    false,
                    false,
                    false,
                    false,
                    false,
                    null,
                    "Webhook payOS thiếu data");
        }

        Map<String, Object> data = new TreeMap<>();
        rawData.forEach((key, value) -> data.put(String.valueOf(key), value));
        String receivedSignature = stringValue(payload.get("signature"));
        boolean signatureValid = payOsPaymentService.isValidWebhookData(data, receivedSignature);
        if (!signatureValid) {
            return new PaymentCallbackResult(
                    false,
                    false,
                    false,
                    false,
                    false,
                    null,
                    "Chữ ký thanh toán không hợp lệ");
        }

        String providerOrderId = stringValue(data.get("orderCode"));
        Optional<PaymentTransaction> optionalTransaction =
                paymentTransactionRepository.findByProviderAndProviderOrderId("PAYOS", providerOrderId);
        if (optionalTransaction.isEmpty()) {
            return new PaymentCallbackResult(
                    true,
                    false,
                    false,
                    false,
                    false,
                    null,
                    "Không tìm thấy giao dịch thanh toán");
        }

        PaymentTransaction transaction = optionalTransaction.get();
        long callbackAmount = parseLong(stringValue(data.get("amount")), -1);
        boolean amountValid = callbackAmount == transaction.getAmountVnd();
        if (!amountValid) {
            return new PaymentCallbackResult(
                    true,
                    true,
                    false,
                    false,
                    false,
                    transaction.getId(),
                    "Số tiền thanh toán không khớp");
        }

        boolean alreadyConfirmed = transaction.getStatus() != CommercialStatus.PENDING;
        if (alreadyConfirmed) {
            return new PaymentCallbackResult(
                    true,
                    true,
                    true,
                    true,
                    transaction.getStatus() == CommercialStatus.ACTIVE,
                    transaction.getId(),
                    transaction.getStatus() == CommercialStatus.ACTIVE
                            ? "Giao dịch đã được xác nhận trước đó"
                            : "Giao dịch đã được xử lý trước đó");
        }

        boolean paid = Boolean.TRUE.equals(payload.get("success"))
                && "00".equals(stringValue(data.get("code")));
        if (paid) {
            activatePaidTransaction(transaction, payload);
            return new PaymentCallbackResult(
                    true,
                    true,
                    true,
                    false,
                    true,
                    transaction.getId(),
                    "Thanh toán thành công. Gói của bạn đã được cập nhật.");
        }

        transaction.setStatus(CommercialStatus.CANCELLED);
        transaction.setRawPayload(toJson(payload));
        paymentTransactionRepository.save(transaction);
        return new PaymentCallbackResult(
                true,
                true,
                true,
                false,
                false,
                transaction.getId(),
                "Thanh toán chưa thành công hoặc đã bị hủy.");
    }

    private void activatePaidTransaction(PaymentTransaction transaction, Map<String, Object> payload) {
        LocalDateTime now = LocalDateTime.now();
        Map<String, Object> data = new TreeMap<>();
        if (payload.get("data") instanceof Map<?, ?> rawData) {
            rawData.forEach((key, value) -> data.put(String.valueOf(key), value));
        }
        transaction.setStatus(CommercialStatus.ACTIVE);
        transaction.setPaidAt(now);
        transaction.setProviderTransactionId(firstText(
                data.get("paymentLinkId"),
                data.get("reference"),
                transaction.getProviderTransactionId()));
        transaction.setRawPayload(toJson(payload));
        paymentTransactionRepository.save(transaction);

        if (transaction.getPlan().getPlanType() == PlanType.EVENT_PASS) {
            activateEventPass(transaction, now);
            return;
        }

        activateSubscription(transaction, now);
    }

    private void activateSubscription(PaymentTransaction transaction, LocalDateTime now) {
        List<UserSubscription> activeSubscriptions = userSubscriptionRepository.findActiveForUser(
                transaction.getUser().getId(),
                CommercialStatus.ACTIVE,
                now);
        activeSubscriptions.forEach(subscription -> {
            subscription.setStatus(CommercialStatus.CANCELLED);
            subscription.setCurrentPeriodEnd(now);
            subscription.setUpdatedAt(now);
        });
        userSubscriptionRepository.saveAll(activeSubscriptions);

        userSubscriptionRepository.save(UserSubscription.builder()
                .user(transaction.getUser())
                .plan(transaction.getPlan())
                .status(CommercialStatus.ACTIVE)
                .startedAt(now)
                .currentPeriodStart(now)
                .currentPeriodEnd(resolveSubscriptionPeriodEnd(transaction.getPlan(), now))
                .provider(transaction.getProvider())
                .providerSubscriptionId(transaction.getProviderOrderId())
                .build());
    }

    private void activateEventPass(PaymentTransaction transaction, LocalDateTime now) {
        if (transaction.getEvent() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event Pass thiếu event");
        }

        eventPassRepository.save(EventPass.builder()
                .event(transaction.getEvent())
                .plan(transaction.getPlan())
                .purchaser(transaction.getUser())
                .status(CommercialStatus.ACTIVE)
                .startsAt(now)
                .expiresAt(now.plusDays(
                        transaction.getPlan().getEventDurationDays() != null
                                ? transaction.getPlan().getEventDurationDays()
                                : 90))
                .provider(transaction.getProvider())
                .providerPaymentId(transaction.getProviderTransactionId())
                .build());
    }

    private LocalDateTime resolveSubscriptionPeriodEnd(SubscriptionPlan plan, LocalDateTime now) {
        if (plan.getBillingInterval() == BillingInterval.YEARLY) {
            return now.plusYears(1);
        }
        if (plan.getBillingInterval() == BillingInterval.CUSTOM) {
            return null;
        }
        return now.plusMonths(1);
    }

    private int subscriptionCreditsUsed(Long userId, ActiveSubscription active) {
        return Math.max(0, -aiCreditLedgerRepository.sumUserCreditsInPeriod(
                userId,
                AiCreditSourceType.SUBSCRIPTION,
                active.periodStart(),
                active.periodEnd() != null ? active.periodEnd() : active.periodStart().plusMonths(1)));
    }

    private int eventCreditsUsed(EffectiveEventEntitlement entitlement) {
        if (entitlement.eventPass().isPresent()) {
            return Math.max(0, -aiCreditLedgerRepository.sumEventPassCredits(entitlement.eventPass().get().getId()));
        }
        return 0;
    }

    private Integer eventAiCreditLimit(EffectiveEventEntitlement entitlement) {
        return entitlement.eventPass().isPresent()
                ? entitlement.plan().getAiCreditsPerEvent()
                : entitlement.plan().getAiCreditsPerMonth();
    }

    private Long storageUsedByEvent(Long eventId) {
        return taskAttachmentRepository.sumStoredFileSizeByEventId(eventId)
                + taskReportRepository.sumImageSizeByEventId(eventId);
    }

    private void validateSubscriptionPlanChange(Long userId, SubscriptionPlan targetPlan) {
        ActiveSubscription active = resolveActiveSubscription(userId);
        if (active.plan().getCode().equals(targetPlan.getCode())) {
            return;
        }

        if (targetPlan.getPriorityRank() >= active.plan().getPriorityRank()) {
            return;
        }

        List<Long> activeEventIds = eventRepository.findActiveNormalEventIdsLedByUser(userId);
        long activeEvents = activeEventIds.size();
        if (!targetPlan.isUnlimitedEvents()
                && targetPlan.getMaxActiveEvents() != null
                && activeEvents > targetPlan.getMaxActiveEvents()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chưa thể đổi xuống " + targetPlan.getDisplayName()
                            + " vì bạn đang có " + activeEvents + " sự kiện active, vượt giới hạn "
                            + targetPlan.getMaxActiveEvents());
        }

        long maxMembers = maxMembersUsed(activeEventIds);
        if (!targetPlan.isUnlimitedUsers()
                && targetPlan.getMaxUsersPerEvent() != null
                && maxMembers > targetPlan.getMaxUsersPerEvent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chưa thể đổi xuống " + targetPlan.getDisplayName()
                            + " vì có sự kiện đang có " + maxMembers + " user, vượt giới hạn "
                            + targetPlan.getMaxUsersPerEvent());
        }

        long maxStorage = maxStorageUsed(activeEventIds);
        if (!targetPlan.isUnlimitedStorage()
                && targetPlan.getStorageLimitBytes() != null
                && maxStorage > targetPlan.getStorageLimitBytes()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chưa thể đổi xuống " + targetPlan.getDisplayName()
                            + " vì có sự kiện đang dùng storage vượt giới hạn gói này");
        }

        int usedCredits = subscriptionCreditsUsed(userId, active);
        if (!targetPlan.isUnlimitedAi()
                && targetPlan.getAiCreditsPerMonth() != null
                && usedCredits > targetPlan.getAiCreditsPerMonth()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chưa thể đổi xuống " + targetPlan.getDisplayName()
                            + " trong kỳ này vì AI credits đã dùng vượt giới hạn gói thấp hơn");
        }
    }

    private String resolveChangeType(Long userId, SubscriptionPlan targetPlan) {
        if (targetPlan.getPlanType() == PlanType.EVENT_PASS) {
            return "EVENT_PASS_PURCHASE";
        }

        ActiveSubscription active = resolveActiveSubscription(userId);
        if (active.plan().getCode().equals(targetPlan.getCode())) {
            return "CURRENT_PLAN";
        }
        if (targetPlan.getPriorityRank() > active.plan().getPriorityRank()) {
            return "UPGRADE";
        }
        return "DOWNGRADE";
    }

    private String resolveCheckoutMessage(SubscriptionPlan plan, String changeType) {
        return switch (changeType) {
            case "CURRENT_PLAN" -> "Bạn đang dùng gói " + plan.getDisplayName() + ". Không cần đổi gói.";
            case "DOWNGRADE" -> "Đã ghi nhận yêu cầu đổi xuống " + plan.getDisplayName()
                    + ". Bạn sẽ được chuyển sang payOS để hoàn tất thanh toán.";
            case "EVENT_PASS_PURCHASE" -> "Bạn sẽ được chuyển sang payOS để thanh toán Event Pass.";
            default -> "Bạn sẽ được chuyển sang payOS để nâng cấp lên " + plan.getDisplayName() + ".";
        };
    }

    private long maxMembersUsed(List<Long> eventIds) {
        return eventIds.stream()
                .mapToLong(eventMemberRepository::countByEventId)
                .max()
                .orElse(0L);
    }

    private long maxStorageUsed(List<Long> eventIds) {
        return eventIds.stream()
                .mapToLong(this::storageUsedByEvent)
                .max()
                .orElse(0L);
    }

    private List<String> buildSubscriptionWarnings(
            SubscriptionPlan plan,
            long activeEvents,
            long maxMembers,
            long maxStorageBytes,
            int usedCredits) {

        List<String> warnings = new ArrayList<>();
        if (!plan.isUnlimitedEvents()
                && plan.getMaxActiveEvents() != null
                && activeEvents > plan.getMaxActiveEvents()) {
            warnings.add("Bạn đang có " + activeEvents + " sự kiện ACTIVE, vượt giới hạn " + plan.getMaxActiveEvents()
                    + " của gói " + plan.getDisplayName() + ".");
        }
        if (!plan.isUnlimitedUsers()
                && plan.getMaxUsersPerEvent() != null
                && maxMembers > plan.getMaxUsersPerEvent()) {
            warnings.add("Một sự kiện bạn lead đang có " + maxMembers + " user, vượt giới hạn "
                    + plan.getMaxUsersPerEvent() + " user/event.");
        }
        if (!plan.isUnlimitedStorage()
                && plan.getStorageLimitBytes() != null
                && maxStorageBytes > plan.getStorageLimitBytes()) {
            warnings.add("Một sự kiện bạn lead đang dùng storage vượt giới hạn gói hiện tại.");
        }
        if (!plan.isUnlimitedAi()
                && plan.getAiCreditsPerMonth() != null
                && usedCredits > plan.getAiCreditsPerMonth()) {
            warnings.add("AI credits đã dùng trong kỳ này vượt giới hạn gói hiện tại.");
        }
        return warnings;
    }

    private Integer remaining(Integer limit, int used, boolean unlimited) {
        if (unlimited || limit == null) {
            return null;
        }
        return Math.max(0, limit - used);
    }

    private ResponseStatusException quotaExceeded(String message) {
        return new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, message);
    }

    private SubscriptionPlanDTO mapPlan(SubscriptionPlan plan) {
        return SubscriptionPlanDTO.builder()
                .code(plan.getCode())
                .displayName(plan.getDisplayName())
                .planType(plan.getPlanType().name())
                .billingInterval(plan.getBillingInterval() != null ? plan.getBillingInterval().name() : null)
                .priceVnd(plan.getPriceVnd())
                .targetSegment(plan.getTargetSegment())
                .maxActiveEvents(plan.getMaxActiveEvents())
                .unlimitedEvents(plan.isUnlimitedEvents())
                .maxUsersPerEvent(plan.getMaxUsersPerEvent())
                .unlimitedUsers(plan.isUnlimitedUsers())
                .storageLimitBytes(plan.getStorageLimitBytes())
                .unlimitedStorage(plan.isUnlimitedStorage())
                .aiCreditsPerMonth(plan.getAiCreditsPerMonth())
                .aiCreditsPerEvent(plan.getAiCreditsPerEvent())
                .unlimitedAi(plan.isUnlimitedAi())
                .eventDurationDays(plan.getEventDurationDays())
                .extraUserPriceVnd(plan.getExtraUserPriceVnd())
                .priorityRank(plan.getPriorityRank())
                .features(parseFeatures(plan.getFeatures()))
                .build();
    }

    private List<String> parseFeatures(String features) {
        if (features == null || features.isBlank()) {
            return List.of();
        }
        return List.of(features.split(";")).stream()
                .map(String::trim)
                .filter(feature -> !feature.isBlank())
                .toList();
    }

    private long parseLong(String value, long fallback) {
        try {
            return Long.parseLong(value);
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private String firstText(Object... values) {
        for (Object value : values) {
            String text = stringValue(value);
            if (text != null && !text.isBlank()) {
                return text;
            }
        }
        return null;
    }

    private String toJson(Object params) {
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException ex) {
            return params.toString();
        }
    }

    private LocalDateTime monthStart(LocalDateTime now) {
        return now.with(TemporalAdjusters.firstDayOfMonth()).toLocalDate().atStartOfDay();
    }

    private record ActiveSubscription(
            SubscriptionPlan plan,
            String status,
            LocalDateTime periodStart,
            LocalDateTime periodEnd,
            String source) {
    }

    private record EffectiveEventEntitlement(
            SubscriptionPlan plan,
            String source,
            LocalDateTime expiresAt,
            Optional<EventPass> eventPass) {
    }

    private record PaymentCallbackResult(
            boolean signatureValid,
            boolean orderFound,
            boolean amountValid,
            boolean alreadyConfirmed,
            boolean success,
            Long transactionId,
            String message) {
    }
}
