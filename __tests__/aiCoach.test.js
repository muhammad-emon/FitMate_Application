// Unit Tests for AI Chatbot Module (Main)
// Follows the AAA Pattern: Arrange -> Act -> Assert
import { askAICoach } from '../src/services/api';

describe('AI Chatbot Module - askAICoach', () => {
  test('1. returns status ok and a non-empty reply string', async () => {
    // Arrange
    const message = 'Hello Zenith';

    // Act
    const response = await askAICoach(message);

    // Assert
    expect(response.status).toBe('ok');
    expect(typeof response.reply).toBe('string');
    expect(response.reply.length).toBeGreaterThan(0);
  });

  test('2. returns protein advice when user asks about protein', async () => {
    // Arrange
    const message = 'How much protein should I eat daily?';

    // Act
    const response = await askAICoach(message);

    // Assert
    expect(response.reply).toMatch(/protein/i);
  });

  test('3. returns workout advice when user asks about exercise', async () => {
    // Arrange
    const message = 'What is the best workout routine?';

    // Act
    const response = await askAICoach(message);

    // Assert
    expect(response.reply).toMatch(/compound movements|consistency/i);
  });
});
