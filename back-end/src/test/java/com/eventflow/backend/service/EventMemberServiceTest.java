package com.eventflow.backend.service;

import com.eventflow.backend.dto.EventMemberRequestDTO;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventInvitation;
import com.eventflow.backend.entity.EventInvitationStatus;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventInvitationRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventMemberServiceTest {

    @Mock
    private EventMemberRepository eventMemberRepository;

    @Mock
    private EventInvitationRepository eventInvitationRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private AuthEmailService authEmailService;

    private EventMemberService eventMemberService;

    @BeforeEach
    void setUp() {
        eventMemberService = new EventMemberService(
                eventMemberRepository,
                eventInvitationRepository,
                eventRepository,
                userRepository,
                userProfileService,
                authEmailService);
        ReflectionTestUtils.setField(eventMemberService, "invitationTokenTtlMinutes", 10080L);
    }

    @Test
    void addMemberCreatesPendingInvitationInsteadOfMembership() {
        Event event = Event.builder()
                .id(10L)
                .name("Workshop")
                .eventDate(LocalDateTime.now().plusDays(7))
                .build();
        User leader = User.builder()
                .id(1L)
                .name("Leader")
                .email("leader@example.com")
                .build();
        User invitee = User.builder()
                .id(2L)
                .name("Member")
                .email("member@example.com")
                .build();

        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(invitee));
        when(userRepository.findById(1L)).thenReturn(Optional.of(leader));
        when(eventMemberRepository.existsByEventIdAndUserId(10L, 2L)).thenReturn(false);
        when(eventInvitationRepository.findByEventIdAndInviteeIdAndStatus(10L, 2L, EventInvitationStatus.PENDING))
                .thenReturn(Optional.empty());
        when(eventInvitationRepository.save(any(EventInvitation.class))).thenAnswer(invocation -> {
            EventInvitation invitation = invocation.getArgument(0);
            invitation.setId(99L);
            return invitation;
        });

        var response = eventMemberService.addMember(
                10L,
                new EventMemberRequestDTO("  MEMBER@example.com  ", "MEMBER"),
                1L);

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getEmail()).isEqualTo("member@example.com");
        verify(eventMemberRepository, never()).save(any());
        verify(authEmailService).sendEventInvitationEmail(eq("member@example.com"), anyString(), eq("Workshop"), eq("Leader"));
    }

    @Test
    void confirmInvitationCreatesMembership() {
        Event event = Event.builder()
                .id(10L)
                .name("Workshop")
                .eventDate(LocalDateTime.now().plusDays(7))
                .build();
        User invitee = User.builder()
                .id(2L)
                .name("Member")
                .email("member@example.com")
                .build();
        EventInvitation invitation = EventInvitation.builder()
                .id(99L)
                .event(event)
                .invitee(invitee)
                .email("member@example.com")
                .role(UserRole.MEMBER)
                .status(EventInvitationStatus.PENDING)
                .tokenHash("hash")
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();

        when(eventInvitationRepository.findActiveByTokenHash(anyString(), eq(EventInvitationStatus.PENDING), any(LocalDateTime.class)))
                .thenReturn(Optional.of(invitation));
        when(eventMemberRepository.existsByEventIdAndUserId(10L, 2L)).thenReturn(false);

        var response = eventMemberService.confirmInvitation("token");

        assertThat(response.getEventId()).isEqualTo(10L);
        assertThat(invitation.getStatus()).isEqualTo(EventInvitationStatus.ACCEPTED);
        assertThat(invitation.getAcceptedAt()).isNotNull();
        verify(eventMemberRepository).save(any());
        verify(eventInvitationRepository).save(invitation);
    }
}
