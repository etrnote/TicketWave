package com.ticketwave.config;

import com.ticketwave.entity.Event;
import com.ticketwave.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

/**
 * Seeds poster images into the events table on application startup.
 * Only updates events whose image column is still null, keeping the
 * operation idempotent across restarts.
 */
@Component
public class PosterSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PosterSeeder.class);

    private final EventRepository eventRepository;

    /**
     * Mapping of event ID → poster filename (under classpath:posters/).
     */
    private static final Map<Long, String> EVENT_POSTER_MAP = Map.of(
            1L, "rock.webp",
            2L, "concert.webp",
            3L, "nba.webp",
            4L, "hamlet.jpg",
            5L, "edm.webp",
            6L, "jazz.jpeg",
            7L, "comedy.webp",
            8L, "food.webp"
    );

    public PosterSeeder(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("PosterSeeder: checking for events that need poster images…");

        for (Map.Entry<Long, String> entry : EVENT_POSTER_MAP.entrySet()) {
            Long eventId = entry.getKey();
            String filename = entry.getValue();

            Optional<Event> optionalEvent = eventRepository.findById(eventId);
            if (optionalEvent.isEmpty()) {
                log.warn("PosterSeeder: event {} not found, skipping.", eventId);
                continue;
            }

            Event event = optionalEvent.get();
            if (event.getImage() != null) {
                log.debug("PosterSeeder: event {} already has an image, skipping.", eventId);
                continue;
            }

            try {
                ClassPathResource resource = new ClassPathResource("posters/" + filename);
                byte[] imageBytes = resource.getInputStream().readAllBytes();
                String contentType = resolveContentType(filename);

                event.setImage(imageBytes);
                event.setImageContentType(contentType);
                eventRepository.save(event);

                log.info("PosterSeeder: loaded {} ({} bytes) into event {} – '{}'",
                        filename, imageBytes.length, eventId, event.getTitle());
            } catch (IOException e) {
                log.error("PosterSeeder: failed to read poster file '{}' for event {}: {}",
                        filename, eventId, e.getMessage());
            }
        }

        log.info("PosterSeeder: done.");
    }

    private String resolveContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        return "application/octet-stream";
    }
}
