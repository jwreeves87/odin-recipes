const IngredientProcessor = require('../js/IngredientProcessor');

describe('IngredientProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new IngredientProcessor();
  });

  describe('parseIngredient', () => {
    it('should parse basic ingredient with quantity and unit', () => {
      const result = processor.parseIngredient('2 cups flour');
      
      expect(result).toEqual({
        quantity: 2,
        unit: 'cup',
        item: 'flour',
        originalText: '2 cups flour',
        category: 'pantry'
      });
    });

    it('should parse ingredient with fractional quantity', () => {
      const result = processor.parseIngredient('1/2 cup olive oil');
      
      expect(result).toEqual({
        quantity: 0.5,
        unit: 'cup',
        item: 'olive oil',
        originalText: '1/2 cup olive oil',
        category: 'pantry'
      });
    });

    it('should parse ingredient with mixed number', () => {
      const result = processor.parseIngredient('2 1/4 lbs ground beef');
      
      expect(result).toEqual({
        quantity: 2.25,
        unit: 'pound',
        item: 'ground beef',
        originalText: '2 1/4 lbs ground beef',
        category: 'meat'
      });
    });

    it('should parse ingredient without quantity', () => {
      const result = processor.parseIngredient('salt to taste');
      
      expect(result).toEqual({
        quantity: null,
        unit: null,
        item: 'salt to taste',
        originalText: 'salt to taste',
        category: 'spices'
      });
    });

    it('should handle various unit abbreviations', () => {
      const testCases = [
        { input: '1 tbsp butter', expected: { quantity: 1, unit: 'tablespoon', item: 'butter' } },
        { input: '2 tsp vanilla', expected: { quantity: 2, unit: 'teaspoon', item: 'vanilla' } },
        { input: '3 oz cream cheese', expected: { quantity: 3, unit: 'ounce', item: 'cream cheese' } },
        { input: '4 lb brisket', expected: { quantity: 4, unit: 'pound', item: 'brisket' } }
      ];

      testCases.forEach(testCase => {
        const result = processor.parseIngredient(testCase.input);
        expect(result.quantity).toBe(testCase.expected.quantity);
        expect(result.unit).toBe(testCase.expected.unit);
        expect(result.item).toBe(testCase.expected.item);
      });
    });

    it('should categorize ingredients correctly', () => {
      const testCases = [
        { ingredient: '2 lbs ground beef', category: 'meat' },
        { ingredient: '1 onion', category: 'vegetables' },
        { ingredient: '2 cups flour', category: 'pantry' },
        { ingredient: '1 tsp salt', category: 'spices' },
        { ingredient: '1 cup milk', category: 'dairy' }
      ];

      testCases.forEach(testCase => {
        const result = processor.parseIngredient(testCase.ingredient);
        expect(result.category).toBe(testCase.category);
      });
    });
  });

  describe('consolidateIngredients', () => {
    it('should consolidate identical ingredients with same units', () => {
      const ingredients = [
        { quantity: 1, unit: 'cup', item: 'onion', category: 'vegetables' },
        { quantity: 2, unit: 'cup', item: 'onion', category: 'vegetables' }
      ];

      const result = processor.consolidateIngredients(ingredients);
      
      expect(result).toHaveSize(1);
      expect(result[0]).toEqual({
        quantity: 3,
        unit: 'cup',
        item: 'onion',
        category: 'vegetables',
        consolidated: true
      });
    });

    it('should not consolidate different ingredients', () => {
      const ingredients = [
        { quantity: 1, unit: 'cup', item: 'onion', category: 'vegetables' },
        { quantity: 1, unit: 'cup', item: 'carrot', category: 'vegetables' }
      ];

      const result = processor.consolidateIngredients(ingredients);
      
      expect(result).toHaveSize(2);
      expect(result[0].item).toBe('onion');
      expect(result[1].item).toBe('carrot');
    });

    it('should handle ingredients with different units', () => {
      const ingredients = [
        { quantity: 1, unit: 'cup', item: 'milk', category: 'dairy' },
        { quantity: 8, unit: 'ounce', item: 'milk', category: 'dairy' }
      ];

      const result = processor.consolidateIngredients(ingredients);
      
      // Should keep separate since units are different (would need unit conversion)
      expect(result).toHaveSize(2);
    });

    it('should handle ingredients without quantities', () => {
      const ingredients = [
        { quantity: null, unit: null, item: 'salt to taste', category: 'spices' },
        { quantity: null, unit: null, item: 'pepper to taste', category: 'spices' }
      ];

      const result = processor.consolidateIngredients(ingredients);
      
      expect(result).toHaveSize(2);
    });
  });

  describe('normalizeUnit', () => {
    it('should normalize common unit abbreviations', () => {
      const testCases = [
        { input: 'tbsp', expected: 'tablespoon' },
        { input: 'tsp', expected: 'teaspoon' },
        { input: 'oz', expected: 'ounce' },
        { input: 'lb', expected: 'pound' },
        { input: 'lbs', expected: 'pound' },
        { input: 'cup', expected: 'cup' },
        { input: 'cups', expected: 'cup' }
      ];

      testCases.forEach(testCase => {
        const result = processor.normalizeUnit(testCase.input);
        expect(result).toBe(testCase.expected);
      });
    });
  });

  describe('categorizeIngredient', () => {
    it('should categorize meat ingredients', () => {
      const meatItems = ['beef', 'pork', 'chicken', 'salmon', 'brisket', 'ribs'];
      
      meatItems.forEach(item => {
        const category = processor.categorizeIngredient(item);
        expect(category).toBe('meat');
      });
    });

    it('should categorize vegetable ingredients', () => {
      const vegetables = ['onion', 'carrot', 'celery', 'bell pepper', 'mushroom'];
      
      vegetables.forEach(item => {
        const category = processor.categorizeIngredient(item);
        expect(category).toBe('vegetables');
      });
    });

    it('should categorize spice ingredients', () => {
      const spices = ['salt', 'pepper', 'paprika', 'garlic powder', 'cumin'];
      
      spices.forEach(item => {
        const category = processor.categorizeIngredient(item);
        expect(category).toBe('spices');
      });
    });

    it('should default to pantry for unknown ingredients', () => {
      const category = processor.categorizeIngredient('unknown ingredient');
      expect(category).toBe('pantry');
    });
  });

  describe('parseFraction', () => {
    it('should parse simple fractions', () => {
      const testCases = [
        { input: '1/2', expected: 0.5 },
        { input: '1/4', expected: 0.25 },
        { input: '3/4', expected: 0.75 },
        { input: '2/3', expected: 0.6666666666666666 }
      ];

      testCases.forEach(testCase => {
        const result = processor.parseFraction(testCase.input);
        expect(result).toBeCloseTo(testCase.expected);
      });
    });

    it('should parse mixed numbers', () => {
      const testCases = [
        { input: '2 1/2', expected: 2.5 },
        { input: '1 1/4', expected: 1.25 },
        { input: '3 2/3', expected: 3.6666666666666665 }
      ];

      testCases.forEach(testCase => {
        const result = processor.parseFraction(testCase.input);
        expect(result).toBeCloseTo(testCase.expected);
      });
    });

    it('should return regular numbers unchanged', () => {
      expect(processor.parseFraction('5')).toBe(5);
      expect(processor.parseFraction('2.5')).toBe(2.5);
    });
  });
});