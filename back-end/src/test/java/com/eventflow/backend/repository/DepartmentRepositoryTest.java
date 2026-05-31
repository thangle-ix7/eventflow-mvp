package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class DepartmentRepositoryTest {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findsDepartmentsByEventAndSearchWithPagination() {
        Event event = persistEvent("Conference");
        Event otherEvent = persistEvent("Other");
        persistDepartment(event, "Operations");
        persistDepartment(event, "Marketing");
        persistDepartment(otherEvent, "Other Operations");
        entityManager.flush();
        entityManager.clear();

        var page = departmentRepository.findAllByEventIdAndNameContainingIgnoreCase(
                event.getId(),
                "oper",
                PageRequest.of(0, 10, Sort.by("name")));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getName()).isEqualTo("Operations");
    }

    @Test
    void checksDuplicateDepartmentNameInsideSameEventOnly() {
        Event event = persistEvent("Conference");
        Event otherEvent = persistEvent("Other");
        Department department = persistDepartment(event, "Operations");
        persistDepartment(otherEvent, "Operations");
        entityManager.flush();

        assertThat(departmentRepository.existsByEventIdAndName(event.getId(), "Operations")).isTrue();
        assertThat(departmentRepository.existsByEventIdAndName(event.getId(), "Marketing")).isFalse();
        assertThat(departmentRepository.existsByEventIdAndNameAndIdNot(
                event.getId(),
                "Operations",
                department.getId())).isFalse();
    }

    private Event persistEvent(String name) {
        return entityManager.persist(Event.builder()
                .name(name)
                .eventDate(LocalDateTime.now().plusDays(14))
                .status("ACTIVE")
                .build());
    }

    private Department persistDepartment(Event event, String name) {
        return entityManager.persist(Department.builder()
                .event(event)
                .name(name)
                .build());
    }
}
