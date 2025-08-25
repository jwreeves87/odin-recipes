const RecipeValidator = require('../js/RecipeValidator');
const Recipe = require('../js/Recipe');

describe('RecipeValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new RecipeValidator();
  });

  describe('validateForCreate', () => {
    it('should pass validation for valid recipe data', () => {
      const recipeData = {
        title: 'Test Brisket',
        description: 'A delicious brisket recipe',
        ingredients: ['Salt', 'Pepper', 'Beef Brisket'],
        instructions: ['Season the brisket', 'Smoke for 16 hours'],
        cookTime: 'PT16H',
        servings: '12'
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail validation for missing required fields', () => {
      const recipeData = {
        description: 'A recipe without title'
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('At least one ingredient is required');
      expect(result.errors).toContain('At least one instruction is required');
    });

    it('should fail validation for empty title', () => {
      const recipeData = {
        title: '',
        ingredients: ['Salt'],
        instructions: ['Season']
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('should fail validation for title that is too long', () => {
      const longTitle = 'A'.repeat(201);
      const recipeData = {
        title: longTitle,
        ingredients: ['Salt'],
        instructions: ['Season']
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be 200 characters or less');
    });

    it('should fail validation for empty ingredients array', () => {
      const recipeData = {
        title: 'Test Recipe',
        ingredients: [],
        instructions: ['Do something']
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one ingredient is required');
    });

    it('should fail validation for empty instructions array', () => {
      const recipeData = {
        title: 'Test Recipe',
        ingredients: ['Something'],
        instructions: []
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one instruction is required');
    });

    it('should fail validation for invalid URL format', () => {
      const recipeData = {
        title: 'Test Recipe',
        ingredients: ['Salt'],
        instructions: ['Season'],
        sourceUrl: 'not-a-valid-url'
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source URL must be a valid URL');
    });

    it('should pass validation for valid URL', () => {
      const recipeData = {
        title: 'Test Recipe',
        ingredients: ['Salt'],
        instructions: ['Season'],
        sourceUrl: 'https://example.com/recipe'
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for too many ingredients', () => {
      const tooManyIngredients = Array(101).fill('Ingredient');
      const recipeData = {
        title: 'Test Recipe',
        ingredients: tooManyIngredients,
        instructions: ['Mix everything']
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot have more than 100 ingredients');
    });

    it('should fail validation for too many instructions', () => {
      const tooManyInstructions = Array(51).fill('Do something');
      const recipeData = {
        title: 'Test Recipe',
        ingredients: ['Something'],
        instructions: tooManyInstructions
      };

      const result = validator.validateForCreate(recipeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot have more than 50 instructions');
    });
  });

  describe('validateForUpdate', () => {
    it('should allow partial updates with valid data', () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const result = validator.validateForUpdate(updates);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should prevent updating protected fields', () => {
      const updates = {
        id: 'new-id',
        filename: 'new-filename.html',
        createdAt: new Date(),
        title: 'Updated Title'
      };

      const result = validator.validateForUpdate(updates);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot update protected field: id');
      expect(result.errors).toContain('Cannot update protected field: filename');
      expect(result.errors).toContain('Cannot update protected field: createdAt');
    });

    it('should validate field formats for updates', () => {
      const updates = {
        title: '', // empty title
        sourceUrl: 'invalid-url',
        ingredients: [], // empty ingredients
        servings: 'not-a-number'
      };

      const result = validator.validateForUpdate(updates);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
      expect(result.errors).toContain('Source URL must be a valid URL');
      expect(result.errors).toContain('At least one ingredient is required');
      expect(result.errors).toContain('Servings must be a valid number or range');
    });

    it('should allow empty updates object', () => {
      const result = validator.validateForUpdate({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateServings', () => {
    it('should accept valid serving formats', () => {
      const validServings = ['4', '6-8', '2 to 4', '12 servings', '1'];
      
      validServings.forEach(serving => {
        expect(validator.validateServings(serving)).toBe(true);
      });
    });

    it('should reject invalid serving formats', () => {
      const invalidServings = ['abc', '-5', '0', '101', 'too many words here'];
      
      invalidServings.forEach(serving => {
        expect(validator.validateServings(serving)).toBe(false);
      });
    });

    it('should accept empty servings', () => {
      expect(validator.validateServings('')).toBe(true);
      expect(validator.validateServings(null)).toBe(true);
      expect(validator.validateServings(undefined)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace from strings', () => {
      const input = {
        title: '  Test Recipe  ',
        description: '\tA description\n',
        author: ' John Doe '
      };

      const result = validator.sanitizeInput(input);

      expect(result.title).toBe('Test Recipe');
      expect(result.description).toBe('A description');
      expect(result.author).toBe('John Doe');
    });

    it('should filter out empty ingredients and instructions', () => {
      const input = {
        ingredients: ['Salt', '', '  ', 'Pepper', null, 'Garlic'],
        instructions: ['Step 1', '', 'Step 2', '   ', undefined]
      };

      const result = validator.sanitizeInput(input);

      expect(result.ingredients).toEqual(['Salt', 'Pepper', 'Garlic']);
      expect(result.instructions).toEqual(['Step 1', 'Step 2']);
    });

    it('should remove HTML tags from text fields', () => {
      const input = {
        title: '<script>alert("xss")</script>Clean Title',
        description: '<b>Bold</b> description with <i>italics</i>',
        author: '<a href="evil.com">Author Name</a>'
      };

      const result = validator.sanitizeInput(input);

      expect(result.title).toBe('Clean Title');
      expect(result.description).toBe('Bold description with italics');
      expect(result.author).toBe('Author Name');
    });

    it('should preserve valid data unchanged', () => {
      const input = {
        title: 'Perfect Recipe',
        ingredients: ['Clean ingredient'],
        instructions: ['Clean instruction'],
        servings: '4'
      };

      const result = validator.sanitizeInput(input);

      expect(result).toEqual(input);
    });
  });

  describe('getValidationRules', () => {
    it('should return current validation rules', () => {
      const rules = validator.getValidationRules();

      expect(rules.maxTitleLength).toBe(200);
      expect(rules.maxIngredients).toBe(100);
      expect(rules.maxInstructions).toBe(50);
      expect(rules.protectedFields).toEqual(['id', 'filename', 'createdAt']);
      expect(rules.requiredFields).toEqual(['title', 'ingredients', 'instructions']);
    });
  });
});