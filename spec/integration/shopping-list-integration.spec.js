const ShoppingListGenerator = require('../../js/ShoppingListGenerator');
const ReminderFormatter = require('../../js/ReminderFormatter');

describe('Shopping List Integration Tests', () => {
  let generator;
  let formatter;

  beforeEach(() => {
    generator = new ShoppingListGenerator();
    formatter = new ReminderFormatter();
  });

  describe('End-to-End Shopping List Generation', () => {
    it('should generate shopping list and format for Reminders from single recipe', () => {
      const recipe = {
        id: 'test-recipe-1',
        title: 'BBQ Brisket',
        ingredients: [
          '2 lbs beef brisket',
          '1 tbsp brown sugar',
          '2 tsp salt',
          '1/2 cup BBQ sauce',
          'black pepper to taste'
        ]
      };

      // Generate shopping list
      const listResult = generator.generateFromRecipe(recipe);
      expect(listResult.success).toBe(true);

      const shoppingList = listResult.shoppingList;
      expect(shoppingList.items).toHaveSize(5);
      expect(shoppingList.title).toBe('BBQ Brisket - Shopping List');

      // Verify ingredient parsing
      const brisket = shoppingList.items.find(item => item.item === 'beef brisket');
      expect(brisket.quantity).toBe(2);
      expect(brisket.unit).toBe('pound');
      expect(brisket.category).toBe('meat');

      const brownSugar = shoppingList.items.find(item => item.item === 'brown sugar');
      expect(brownSugar.quantity).toBe(1);
      expect(brownSugar.unit).toBe('tablespoon');

      // Format for Reminders
      const reminderResult = formatter.formatForReminders(shoppingList);
      expect(reminderResult.success).toBe(true);
      expect(reminderResult.reminderText).toContain('2 pound beef brisket');
      expect(reminderResult.reminderText).toContain('1 tablespoon brown sugar');
      expect(reminderResult.reminderText).toContain('black pepper to taste');

      // Generate URL
      const urlResult = formatter.generateReminderUrl(shoppingList);
      expect(urlResult.success).toBe(true);
      expect(urlResult.url).toContain('x-apple-reminderkit://');
      expect(urlResult.url).toContain(encodeURIComponent('BBQ Brisket - Shopping List'));
    });

    it('should consolidate ingredients from multiple recipes', () => {
      const recipes = [
        {
          id: 'recipe-1',
          title: 'BBQ Ribs',
          ingredients: ['2 lbs baby back ribs', '1/2 cup brown sugar', '1 tsp salt']
        },
        {
          id: 'recipe-2',
          title: 'BBQ Sauce',
          ingredients: ['1/4 cup brown sugar', '2 tsp salt', '1 cup ketchup']
        }
      ];

      const listResult = generator.generateFromMultipleRecipes(recipes, 'BBQ Party Shopping List');
      expect(listResult.success).toBe(true);

      const shoppingList = listResult.shoppingList;
      expect(shoppingList.title).toBe('BBQ Party Shopping List');

      // Check consolidation
      const brownSugar = shoppingList.items.find(item => item.item === 'brown sugar');
      expect(brownSugar.quantity).toBe(0.75); // 1/2 + 1/4
      expect(brownSugar.consolidated).toBe(true);

      const salt = shoppingList.items.find(item => item.item === 'salt');
      expect(salt.quantity).toBe(3); // 1 + 2
      expect(salt.consolidated).toBe(true);

      // Format with categories
      const reminderResult = formatter.formatForReminders(shoppingList, { organizeByCategory: true });
      expect(reminderResult.success).toBe(true);
      expect(reminderResult.reminderText).toContain('MEAT:');
      expect(reminderResult.reminderText).toContain('PANTRY:');
      expect(reminderResult.reminderText).toContain('SPICES:');
    });

    it('should handle fractional quantities correctly in URL generation', () => {
      const recipe = {
        id: 'fraction-test',
        title: 'Fraction Test',
        ingredients: [
          '1/2 cup milk',
          '1 1/4 cups flour',
          '2/3 cup sugar'
        ]
      };

      const listResult = generator.generateFromRecipe(recipe);
      expect(listResult.success).toBe(true);

      const reminderResult = formatter.formatForReminders(listResult.shoppingList);
      expect(reminderResult.success).toBe(true);
      
      // Should format fractions nicely
      expect(reminderResult.reminderText).toContain('1/2 cup milk');
      expect(reminderResult.reminderText).toContain('1 1/4 cup flour');
      expect(reminderResult.reminderText).toContain('2/3 cup sugar');

      const urlResult = formatter.generateReminderUrl(listResult.shoppingList);
      expect(urlResult.success).toBe(true);
      expect(urlResult.url).toContain(encodeURIComponent('1/2 cup milk'));
    });

    it('should organize ingredients by category', () => {
      const recipe = {
        id: 'category-test',
        title: 'Category Test Recipe',
        ingredients: [
          '2 lbs beef brisket',      // meat
          '1 onion',                 // vegetables
          '2 tbsp salt',             // spices
          '1 cup flour',             // pantry
          '1/2 cup milk'             // dairy
        ]
      };

      const listResult = generator.generateFromRecipe(recipe);
      expect(listResult.success).toBe(true);

      const shoppingList = listResult.shoppingList;
      expect(shoppingList.organized).toBeDefined();
      expect(shoppingList.organized.meat).toHaveSize(1);
      expect(shoppingList.organized.vegetables).toHaveSize(1);
      expect(shoppingList.organized.spices).toHaveSize(1);
      expect(shoppingList.organized.pantry).toHaveSize(1);
      expect(shoppingList.organized.dairy).toHaveSize(1);

      // Test organized formatting
      const reminderResult = formatter.formatForReminders(shoppingList, { organizeByCategory: true });
      expect(reminderResult.success).toBe(true);
      
      const text = reminderResult.reminderText;
      expect(text).toContain('MEAT:');
      expect(text).toContain('VEGETABLES:');
      expect(text).toContain('SPICES:');
      expect(text).toContain('PANTRY:');
      expect(text).toContain('DAIRY:');
    });

    it('should handle edge cases and errors gracefully', () => {
      // Test invalid recipe
      const invalidResult = generator.generateFromRecipe(null);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBeDefined();

      // Test empty shopping list
      const emptyList = { title: 'Empty', items: [] };
      const urlResult = formatter.generateReminderUrl(emptyList);
      expect(urlResult.success).toBe(false);
      expect(urlResult.error).toBe('Shopping list is empty');

      // Test malformed ingredient handling
      const recipe = {
        id: 'edge-case',
        title: 'Edge Case Recipe',
        ingredients: [
          '2 cups flour',    // valid
          '',               // empty string
          null,             // null value
          'just text',      // no quantity
          '??? weird ingredient ???'  // weird characters
        ]
      };

      const listResult = generator.generateFromRecipe(recipe);
      expect(listResult.success).toBe(true);
      
      // Should filter out invalid items and process valid ones
      const validItems = listResult.shoppingList.items.filter(item => item !== null);
      expect(validItems.length).toBeGreaterThan(0);
    });
  });
});