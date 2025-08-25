const ShoppingListValidator = require('../js/ShoppingListValidator');

describe('ShoppingListValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ShoppingListValidator();
  });

  describe('validateShoppingListRequest', () => {
    it('should validate single recipe ID request', () => {
      const request = {
        recipeIds: ['recipe-1'],
        listName: 'Test Shopping List'
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData).toEqual({
        recipeIds: ['recipe-1'],
        listName: 'Test Shopping List',
        options: {}
      });
    });

    it('should validate multiple recipe IDs request', () => {
      const request = {
        recipeIds: ['recipe-1', 'recipe-2', 'recipe-3'],
        listName: 'Multi Recipe List',
        options: {
          organizeByCategory: true,
          scaleMultiplier: 2
        }
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.recipeIds).toEqual(['recipe-1', 'recipe-2', 'recipe-3']);
      expect(result.sanitizedData.options.organizeByCategory).toBe(true);
      expect(result.sanitizedData.options.scaleMultiplier).toBe(2);
    });

    it('should reject empty recipe IDs array', () => {
      const request = {
        recipeIds: [],
        listName: 'Empty List'
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one recipe ID is required');
    });

    it('should reject missing recipe IDs', () => {
      const request = {
        listName: 'Missing IDs'
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Recipe IDs are required');
    });

    it('should reject invalid recipe ID format', () => {
      const request = {
        recipeIds: ['valid-id', '', null, 123, 'another-valid-id'],
        listName: 'Mixed IDs'
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All recipe IDs must be non-empty strings');
    });

    it('should sanitize and validate list name', () => {
      const request = {
        recipeIds: ['recipe-1'],
        listName: '  <script>alert("xss")</script>My List  '
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.listName).toBe('My List'); // XSS removed and trimmed
    });

    it('should reject excessively long list names', () => {
      const longName = 'a'.repeat(201); // Over 200 character limit
      const request = {
        recipeIds: ['recipe-1'],
        listName: longName
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('List name must be 200 characters or less');
    });

    it('should validate scale multiplier option', () => {
      const validScales = [0.5, 1, 1.5, 2, 10];
      const invalidScales = [0, -1, 'string', null, Infinity, NaN];

      validScales.forEach(scale => {
        const request = {
          recipeIds: ['recipe-1'],
          options: { scaleMultiplier: scale }
        };

        const result = validator.validateShoppingListRequest(request);
        expect(result.isValid).toBe(true);
      });

      invalidScales.forEach(scale => {
        const request = {
          recipeIds: ['recipe-1'],
          options: { scaleMultiplier: scale }
        };

        const result = validator.validateShoppingListRequest(request);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate category filter option', () => {
      const validCategories = [
        ['meat'],
        ['meat', 'vegetables'],
        ['pantry', 'spices', 'dairy']
      ];

      const invalidCategories = [
        'string', // not an array
        [], // empty array
        [123], // not strings
        [''], // empty string
        ['invalidcategory'] // unknown category
      ];

      validCategories.forEach(categories => {
        const request = {
          recipeIds: ['recipe-1'],
          options: { categoryFilter: categories }
        };

        const result = validator.validateShoppingListRequest(request);
        expect(result.isValid).toBe(true);
      });

      invalidCategories.forEach(categories => {
        const request = {
          recipeIds: ['recipe-1'],
          options: { categoryFilter: categories }
        };

        const result = validator.validateShoppingListRequest(request);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateShoppingList', () => {
    it('should validate complete shopping list object', () => {
      const shoppingList = {
        title: 'Valid Shopping List',
        items: [
          { quantity: 2, unit: 'cups', item: 'flour', category: 'pantry' },
          { quantity: 1, unit: 'tsp', item: 'salt', category: 'spices' }
        ],
        recipes: ['recipe-1'],
        createdAt: new Date(),
        itemCount: 2
      };

      const result = validator.validateShoppingList(shoppingList);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedList).toBeDefined();
    });

    it('should reject shopping list without title', () => {
      const shoppingList = {
        items: [{ item: 'flour' }]
      };

      const result = validator.validateShoppingList(shoppingList);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shopping list must have a title');
    });

    it('should reject shopping list without items', () => {
      const shoppingList = {
        title: 'Empty List'
        // no items
      };

      const result = validator.validateShoppingList(shoppingList);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shopping list must have items');
    });

    it('should reject shopping list with empty items array', () => {
      const shoppingList = {
        title: 'Empty Items',
        items: []
      };

      const result = validator.validateShoppingList(shoppingList);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shopping list must have at least one item');
    });

    it('should validate individual shopping list items', () => {
      const shoppingList = {
        title: 'Test List',
        items: [
          { quantity: 2, unit: 'cups', item: 'flour' }, // valid
          { item: 'salt' }, // valid (no quantity)
          { quantity: 'invalid', unit: 'cups', item: 'sugar' }, // invalid quantity
          { quantity: 1, unit: 123, item: 'milk' }, // invalid unit
          { quantity: 1, unit: 'cup' } // missing item
        ]
      };

      const result = validator.validateShoppingList(shoppingList);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 3: quantity must be a number or null');
      expect(result.errors).toContain('Item 4: unit must be a string or null');
      expect(result.errors).toContain('Item 5: item name is required');
    });

    it('should sanitize shopping list items', () => {
      const shoppingList = {
        title: '<script>XSS</script>Clean List',
        items: [
          { 
            quantity: 2.5, 
            unit: '  cups  ', 
            item: '  <b>flour</b>  ',
            category: '  pantry  '
          }
        ]
      };

      const result = validator.validateShoppingList(shoppingList);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedList.title).toBe('Clean List');
      expect(result.sanitizedList.items[0].unit).toBe('cups');
      expect(result.sanitizedList.items[0].item).toBe('flour');
      expect(result.sanitizedList.items[0].category).toBe('pantry');
    });
  });

  describe('validateRecipeId', () => {
    it('should validate properly formatted recipe IDs', () => {
      const validIds = [
        'recipe-123',
        'abc123def456',
        'user_recipe_001',
        'recipe.with.dots',
        'UPPERCASE-recipe',
        'recipe-with-dashes-and_underscores'
      ];

      validIds.forEach(id => {
        const result = validator.validateRecipeId(id);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid recipe IDs', () => {
      const invalidIds = [
        null,
        undefined,
        '',
        '   ',
        123,
        {},
        [],
        'recipe with spaces',
        'recipe@with#special!chars',
        'recipe/with/slashes',
        'a', // too short
        'a'.repeat(101) // too long
      ];

      invalidIds.forEach(id => {
        const result = validator.validateRecipeId(id);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove HTML tags and scripts', () => {
      const dangerous = '<script>alert("xss")</script><b>Bold</b> <i>Italic</i> text';
      const safe = validator.sanitizeHtml(dangerous);
      expect(safe).toBe('Bold Italic text');
    });

    it('should handle empty and null values', () => {
      expect(validator.sanitizeHtml('')).toBe('');
      expect(validator.sanitizeHtml(null)).toBe('');
      expect(validator.sanitizeHtml(undefined)).toBe('');
    });

    it('should preserve safe text content', () => {
      const safeText = 'This is safe text with numbers 123 and symbols !@#$%';
      const result = validator.sanitizeHtml(safeText);
      expect(result).toBe(safeText);
    });
  });

  describe('validateQuantity', () => {
    it('should validate numeric quantities', () => {
      const validQuantities = [0, 0.5, 1, 2.5, 10, 100];

      validQuantities.forEach(qty => {
        const result = validator.validateQuantity(qty);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedQuantity).toBe(qty);
      });
    });

    it('should accept null quantities', () => {
      const result = validator.validateQuantity(null);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedQuantity).toBe(null);
    });

    it('should reject invalid quantities', () => {
      const invalidQuantities = ['string', {}, [], NaN, Infinity, -1];

      invalidQuantities.forEach(qty => {
        const result = validator.validateQuantity(qty);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateUnit', () => {
    it('should validate known units', () => {
      const validUnits = [
        'cup', 'cups', 'tablespoon', 'tbsp', 'teaspoon', 'tsp',
        'pound', 'lb', 'ounce', 'oz', 'gram', 'kg'
      ];

      validUnits.forEach(unit => {
        const result = validator.validateUnit(unit);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedUnit).toBe(unit.trim().toLowerCase());
      });
    });

    it('should accept null units', () => {
      const result = validator.validateUnit(null);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUnit).toBe(null);
    });

    it('should accept custom units with validation warning', () => {
      const result = validator.validateUnit('custom-unit');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUnit).toBe('custom-unit');
      expect(result.warning).toContain('Unknown unit');
    });

    it('should reject invalid unit types', () => {
      const invalidUnits = [123, {}, [], ''];

      invalidUnits.forEach(unit => {
        const result = validator.validateUnit(unit);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateCategory', () => {
    it('should validate known categories', () => {
      const validCategories = ['meat', 'vegetables', 'pantry', 'spices', 'dairy'];

      validCategories.forEach(category => {
        const result = validator.validateCategory(category);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedCategory).toBe(category);
      });
    });

    it('should default unknown categories to pantry', () => {
      const result = validator.validateCategory('unknown-category');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCategory).toBe('pantry');
      expect(result.warning).toContain('Unknown category');
    });

    it('should handle null categories', () => {
      const result = validator.validateCategory(null);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCategory).toBe('pantry');
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle request with all optional parameters', () => {
      const request = {
        recipeIds: ['recipe-1', 'recipe-2'],
        listName: 'Complete Test List',
        options: {
          organizeByCategory: true,
          scaleMultiplier: 1.5,
          categoryFilter: ['meat', 'vegetables'],
          includeMetadata: true
        }
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.recipeIds).toEqual(['recipe-1', 'recipe-2']);
      expect(result.sanitizedData.listName).toBe('Complete Test List');
      expect(result.sanitizedData.options.organizeByCategory).toBe(true);
      expect(result.sanitizedData.options.scaleMultiplier).toBe(1.5);
      expect(result.sanitizedData.options.categoryFilter).toEqual(['meat', 'vegetables']);
      expect(result.sanitizedData.options.includeMetadata).toBe(true);
    });

    it('should accumulate multiple validation errors', () => {
      const request = {
        recipeIds: ['', null, 'valid-id'],
        listName: 'a'.repeat(201), // too long
        options: {
          scaleMultiplier: -1, // invalid
          categoryFilter: ['invalid-category'] // invalid
        }
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('All recipe IDs must be non-empty strings');
      expect(result.errors).toContain('List name must be 200 characters or less');
    });

    it('should provide detailed error messages for debugging', () => {
      const request = {
        recipeIds: ['recipe-1'],
        options: {
          scaleMultiplier: 'not-a-number'
        }
      };

      const result = validator.validateShoppingListRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Scale multiplier must be a positive number');
      expect(result.details).toBeDefined();
    });
  });
});