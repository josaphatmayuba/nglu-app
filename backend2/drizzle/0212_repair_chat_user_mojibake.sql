-- Repair mojibake from double-encoded UTF-8 in chat-visible text.
--
-- Example: an accented name stored/displayed as mojibake.
-- MySQL latin1 behaves like cp1252, which lets us reverse the accidental
-- UTF-8-as-Windows-1252 decode for affected values only.

SET @bad_mojibake := '%C383%';

UPDATE users
SET firstName = CONVERT(BINARY CONVERT(firstName USING latin1) USING utf8mb4)
WHERE firstName IS NOT NULL AND HEX(firstName) LIKE @bad_mojibake;

UPDATE users
SET lastName = CONVERT(BINARY CONVERT(lastName USING latin1) USING utf8mb4)
WHERE lastName IS NOT NULL AND HEX(lastName) LIKE @bad_mojibake;

UPDATE chat_channels
SET name = CONVERT(BINARY CONVERT(name USING latin1) USING utf8mb4)
WHERE name IS NOT NULL AND HEX(name) LIKE @bad_mojibake;

UPDATE chat_channels
SET description = CONVERT(BINARY CONVERT(description USING latin1) USING utf8mb4)
WHERE description IS NOT NULL AND HEX(description) LIKE @bad_mojibake;

UPDATE journal_discussions
SET title = CONVERT(BINARY CONVERT(title USING latin1) USING utf8mb4)
WHERE title IS NOT NULL AND HEX(title) LIKE @bad_mojibake;

UPDATE journal_messages
SET content = CONVERT(BINARY CONVERT(content USING latin1) USING utf8mb4)
WHERE content IS NOT NULL AND HEX(content) LIKE @bad_mojibake;
