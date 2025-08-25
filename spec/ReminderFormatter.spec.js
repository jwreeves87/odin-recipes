const ReminderFormatter = require('../js/ReminderFormatter');

describe('ReminderFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new ReminderFormatter();
  });

  describe('formatForReminders', () => {
    it('should format shopping list for Reminders app', () => {
      const shoppingList = {
        title: 'BBQ Shopping List',
        items: [
          { quantity: 2, unit: 'lbs', item: 'beef brisket', category: 'meat' },
          { quantity: 1, unit: 'cup', item: 'brown sugar', category: 'pantry' },
          { quantity: null, unit: null, item: 'salt to taste', category: 'spices' }
        ],
        recipes: ['recipe-1']
      };

      const result = formatter.formatForReminders(shoppingList);

      expect(result.success).toBe(true);
      expect(result.reminderText).toContain('2 lbs beef brisket');
      expect(result.reminderText).toContain('1 cup brown sugar');
      expect(result.reminderText).toContain('salt to taste');
      expect(result.listName).toBe('BBQ Shopping List');
      expect(result.itemCount).toBe(3);
    });

    it('should handle organized categories', () => {
      const shoppingList = {
        title: 'Organized List',
        organized: {
          meat: [{ quantity: 2, unit: 'lbs', item: 'brisket' }],
          vegetables: [{ quantity: 1, unit: null, item: 'onion' }],
          spices: [{ quantity: 1, unit: 'tsp', item: 'salt' }]
        }
      };

      const result = formatter.formatForReminders(shoppingList, { organizeByCategory: true });

      expect(result.success).toBe(true);
      expect(result.reminderText).toContain('MEAT');
      expect(result.reminderText).toContain('2 lbs brisket');
      expect(result.reminderText).toContain('VEGETABLES');
      expect(result.reminderText).toContain('onion');
      expect(result.reminderText).toContain('SPICES');
      expect(result.reminderText).toContain('1 tsp salt');
    });

    it('should properly escape special characters', () => {
      const shoppingList = {
        title: 'List with "Special" Characters & Symbols',
        items: [
          { quantity: 1, unit: 'cup', item: 'sugar & spice mix', category: 'pantry' }
        ]
      };

      const result = formatter.formatForReminders(shoppingList);

      expect(result.success).toBe(true);
      expect(result.listName).toBe('List with "Special" Characters & Symbols');
      expect(result.reminderText).toContain('sugar & spice mix');
    });
  });

  describe('generateReminderUrl', () => {
    it('should generate valid Reminders app URL', () => {
      const shoppingList = {
        title: 'Test Shopping List',
        items: [
          { quantity: 2, unit: 'cups', item: 'flour' }
        ]
      };

      const result = formatter.generateReminderUrl(shoppingList);

      expect(result.success).toBe(true);
      expect(result.url).toContain('x-apple-reminderkit://');
      expect(result.url).toContain('REMSaveRequest');
      expect(result.url).toContain(encodeURIComponent('Test Shopping List'));
      expect(result.url).toContain(encodeURIComponent('2 cups flour'));
    });

    it('should handle custom list name', () => {
      const shoppingList = {
        title: 'Original Title',
        items: [{ quantity: 1, unit: 'lb', item: 'beef' }]
      };

      const result = formatter.generateReminderUrl(shoppingList, { listName: 'Custom List Name' });

      expect(result.success).toBe(true);
      expect(result.url).toContain(encodeURIComponent('Custom List Name'));
    });

    it('should handle empty shopping list', () => {
      const shoppingList = {
        title: 'Empty List',
        items: []
      };

      const result = formatter.generateReminderUrl(shoppingList);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shopping list is empty');
    });
  });

  describe('formatItemText', () => {
    it('should format ingredient with quantity and unit', () => {
      const item = { quantity: 2, unit: 'cups', item: 'flour' };
      const result = formatter.formatItemText(item);
      expect(result).toBe('2 cups flour');
    });

    it('should format ingredient with only quantity', () => {
      const item = { quantity: 3, unit: null, item: 'eggs' };
      const result = formatter.formatItemText(item);
      expect(result).toBe('3 eggs');
    });

    it('should format ingredient with no quantity', () => {
      const item = { quantity: null, unit: null, item: 'salt to taste' };
      const result = formatter.formatItemText(item);
      expect(result).toBe('salt to taste');
    });

    it('should handle fractional quantities', () => {
      const item = { quantity: 0.5, unit: 'cup', item: 'milk' };
      const result = formatter.formatItemText(item);
      expect(result).toBe('1/2 cup milk');
    });

    it('should handle mixed number quantities', () => {
      const item = { quantity: 2.25, unit: 'lbs', item: 'beef' };
      const result = formatter.formatItemText(item);
      expect(result).toBe('2 1/4 lbs beef');
    });
  });

  describe('formatAsFraction', () => {
    it('should convert decimals to fractions', () => {
      const testCases = [
        { input: 0.5, expected: '1/2' },
        { input: 0.25, expected: '1/4' },
        { input: 0.75, expected: '3/4' },
        { input: 0.33, expected: '1/3' },
        { input: 0.67, expected: '2/3' }
      ];

      testCases.forEach(testCase => {
        const result = formatter.formatAsFraction(testCase.input);
        expect(result).toBe(testCase.expected);
      });
    });

    it('should handle mixed numbers', () => {
      const testCases = [
        { input: 2.5, expected: '2 1/2' },
        { input: 1.25, expected: '1 1/4' },
        { input: 3.75, expected: '3 3/4' }
      ];

      testCases.forEach(testCase => {
        const result = formatter.formatAsFraction(testCase.input);
        expect(result).toBe(testCase.expected);
      });
    });

    it('should return whole numbers as integers', () => {
      expect(formatter.formatAsFraction(2)).toBe('2');
      expect(formatter.formatAsFraction(5.0)).toBe('5');
    });
  });

  describe('sanitizeForUrl', () => {
    it('should properly encode special characters for URLs', () => {
      const testCases = [
        { input: 'Simple Text', expected: 'Simple%20Text' },
        { input: 'Text with & symbols', expected: 'Text%20with%20%26%20symbols' },
        { input: 'Quotes "here"', expected: 'Quotes%20%22here%22' },
        { input: 'Line\nbreaks', expected: 'Line%0Abreaks' }
      ];

      testCases.forEach(testCase => {
        const result = formatter.sanitizeForUrl(testCase.input);
        expect(result).toBe(testCase.expected);
      });
    });
  });

  describe('validation and error handling', () => {
    it('should validate shopping list structure', () => {
      const invalidLists = [
        null,
        undefined,
        {},
        { title: 'No items' },
        { items: [] },
        { title: '', items: [{ item: 'test' }] }
      ];

      invalidLists.forEach(list => {
        const result = formatter.formatForReminders(list);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should handle malformed items gracefully', () => {
      const shoppingList = {
        title: 'Test List',
        items: [
          { quantity: 1, unit: 'cup', item: 'flour' }, // valid
          { item: 'invalid item' }, // missing quantity/unit
          null, // invalid item
          { quantity: 'invalid', unit: 'cup', item: 'sugar' } // invalid quantity
        ]
      };

      const result = formatter.formatForReminders(shoppingList);

      expect(result.success).toBe(true);
      expect(result.reminderText).toContain('1 cup flour');
      expect(result.reminderText).toContain('invalid item');
      // Should handle malformed items gracefully
    });
  });

  describe('URL scheme compatibility', () => {
    it('should generate URL compatible with iOS Reminders', () => {
      const shoppingList = {
        title: 'iOS Test',
        items: [{ quantity: 1, unit: 'cup', item: 'test ingredient' }]
      };

      const result = formatter.generateReminderUrl(shoppingList);

      expect(result.url).toMatch(/^x-apple-reminderkit:\/\//);
      expect(result.url).toContain('REMSaveRequest');
      // Should not contain unencoded special characters
      expect(result.url).not.toContain(' ');
      expect(result.url).not.toContain('\n');
    });

    it('should generate URL compatible with macOS Reminders', () => {
      const shoppingList = {
        title: 'macOS Test',
        items: [{ quantity: 2, unit: 'lbs', item: 'test meat' }]
      };

      const result = formatter.generateReminderUrl(shoppingList, { platform: 'macos' });

      expect(result.success).toBe(true);
      expect(result.url).toContain('x-apple-reminderkit://');
      expect(result.platform).toBe('macos');
    });
  });
});