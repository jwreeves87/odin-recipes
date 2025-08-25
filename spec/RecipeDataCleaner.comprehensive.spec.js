const RecipeDataCleaner = require('../js/RecipeDataCleaner');

describe('RecipeDataCleaner - Comprehensive', function() {
  let cleaner;

  beforeEach(function() {
    cleaner = new RecipeDataCleaner();
  });

  describe('isValidIngredient', function() {
    it('should accept ingredients with measurements', function() {
      expect(cleaner.isValidIngredient('2 cups flour')).toBe(true);
      expect(cleaner.isValidIngredient('1 tsp salt')).toBe(true);
      expect(cleaner.isValidIngredient('3 lb chicken')).toBe(true);
      expect(cleaner.isValidIngredient('1/2 cup sugar')).toBe(true);
    });

    it('should accept recognized food items', function() {
      expect(cleaner.isValidIngredient('2 salmon fillets')).toBe(true);
      expect(cleaner.isValidIngredient('soy sauce')).toBe(true);
      expect(cleaner.isValidIngredient('brown sugar')).toBe(true);
      expect(cleaner.isValidIngredient('fresh ginger')).toBe(true);
    });

    it('should reject HTML content', function() {
      expect(cleaner.isValidIngredient('<img src="test.jpg">')).toBe(false);
      expect(cleaner.isValidIngredient('Text with <script>')).toBe(false);
      expect(cleaner.isValidIngredient('ingredient class="test"')).toBe(false);
    });

    it('should reject instruction-like content', function() {
      expect(cleaner.isValidIngredient('Transfer the salmon to smoker')).toBe(false);
      expect(cleaner.isValidIngredient('Continue to smoke at 200°F')).toBe(false);
      expect(cleaner.isValidIngredient('place on your grill grate')).toBe(false);
    });

    it('should reject overly long text', function() {
      const longText = 'a'.repeat(250);
      expect(cleaner.isValidIngredient(longText)).toBe(false);
    });

    it('should reject empty or invalid input', function() {
      expect(cleaner.isValidIngredient('')).toBe(false);
      expect(cleaner.isValidIngredient(null)).toBe(false);
      expect(cleaner.isValidIngredient(undefined)).toBe(false);
      expect(cleaner.isValidIngredient(123)).toBe(false);
    });
  });

  describe('looksLikeIngredient', function() {
    it('should identify ingredients with measurements', function() {
      expect(cleaner.looksLikeIngredient('2 tbsp olive oil')).toBe(true);
      expect(cleaner.looksLikeIngredient('1 pound ground beef')).toBe(true);
      expect(cleaner.looksLikeIngredient('3 cups water')).toBe(true);
    });

    it('should identify food items without measurements', function() {
      expect(cleaner.looksLikeIngredient('salmon')).toBe(true);
      expect(cleaner.looksLikeIngredient('brown sugar')).toBe(true);
      expect(cleaner.looksLikeIngredient('soy sauce')).toBe(true);
    });

    it('should identify short items with numbers', function() {
      expect(cleaner.looksLikeIngredient('2 eggs')).toBe(true);
      expect(cleaner.looksLikeIngredient('1 onion')).toBe(true);
    });

    it('should reject instruction-like text', function() {
      expect(cleaner.looksLikeIngredient('Transfer the salmon')).toBe(false);
      expect(cleaner.looksLikeIngredient('Continue to smoke')).toBe(false);
    });
  });

  describe('looksLikeInstruction', function() {
    it('should identify instruction-like content', function() {
      expect(cleaner.looksLikeInstruction('Transfer the salmon to the smoker')).toBe(true);
      expect(cleaner.looksLikeInstruction('Continue to smoke at 200°F')).toBe(true);
      expect(cleaner.looksLikeInstruction('place on your grill grate')).toBe(true);
      expect(cleaner.looksLikeInstruction('smoker temperature')).toBe(true);
    });

    it('should reject ingredient-like content', function() {
      expect(cleaner.looksLikeInstruction('2 cups flour')).toBe(false);
      expect(cleaner.looksLikeInstruction('1 tsp salt')).toBe(false);
    });
  });

  describe('extractInstructionText', function() {
    it('should extract text from string', function() {
      expect(cleaner.extractInstructionText('Heat the oven')).toBe('Heat the oven');
    });

    it('should extract text from object with text property', function() {
      expect(cleaner.extractInstructionText({ text: 'Mix ingredients' })).toBe('Mix ingredients');
    });

    it('should extract name from object', function() {
      expect(cleaner.extractInstructionText({ name: 'Bake for 30 minutes' })).toBe('Bake for 30 minutes');
    });

    it('should handle invalid input', function() {
      expect(cleaner.extractInstructionText(null)).toBe('');
      expect(cleaner.extractInstructionText({})).toBe('');
    });
  });

  describe('isValidInstruction', function() {
    it('should accept valid cooking instructions', function() {
      expect(cleaner.isValidInstruction('Heat the smoker to 225°F')).toBe(true);
      expect(cleaner.isValidInstruction('Place salmon on grill grate')).toBe(true);
      expect(cleaner.isValidInstruction('Cook until internal temperature reaches 140°F')).toBe(true);
    });

    it('should reject HTML content', function() {
      expect(cleaner.isValidInstruction('Step 1 <img src="test.jpg">')).toBe(false);
      expect(cleaner.isValidInstruction('Mix <script>alert("test")</script>')).toBe(false);
    });

    it('should reject comment content', function() {
      expect(cleaner.isValidInstruction('John says this is great')).toBe(false);
      expect(cleaner.isValidInstruction('Reply to this comment')).toBe(false);
      expect(cleaner.isValidInstruction('Posted on 2024-01-01 at 3:00 pm')).toBe(false);
    });

    it('should reject too short or too long text', function() {
      expect(cleaner.isValidInstruction('Heat')).toBe(false); // Too short
      const longText = 'a'.repeat(350);
      expect(cleaner.isValidInstruction(longText)).toBe(false); // Too long
    });

    it('should require cooking actions', function() {
      expect(cleaner.isValidInstruction('This is just random text without cooking words')).toBe(false);
    });
  });

  describe('containsHtml', function() {
    it('should detect HTML tags', function() {
      expect(cleaner.containsHtml('<img src="test.jpg">')).toBe(true);
      expect(cleaner.containsHtml('Text with <script>')).toBe(true);
      expect(cleaner.containsHtml('class="test"')).toBe(true);
      expect(cleaner.containsHtml('srcset="images.jpg"')).toBe(true);
    });

    it('should not flag normal text', function() {
      expect(cleaner.containsHtml('Normal cooking instruction')).toBe(false);
      expect(cleaner.containsHtml('2 cups flour')).toBe(false);
    });
  });

  describe('isCommentContent', function() {
    it('should detect comment indicators', function() {
      expect(cleaner.isCommentContent('John says this is great')).toBe(true);
      expect(cleaner.isCommentContent('Reply to comment')).toBe(true);
      expect(cleaner.isCommentContent('Posted at 3:00 pm')).toBe(true);
      expect(cleaner.isCommentContent('Comment from 2024')).toBe(true);
      expect(cleaner.isCommentContent('avatar image')).toBe(true);
    });

    it('should not flag cooking instructions', function() {
      expect(cleaner.isCommentContent('Heat the smoker to 225°F')).toBe(false);
      expect(cleaner.isCommentContent('Mix ingredients together')).toBe(false);
    });
  });

  describe('containsCookingActions', function() {
    it('should detect cooking action words', function() {
      expect(cleaner.containsCookingActions('Heat the smoker')).toBe(true);
      expect(cleaner.containsCookingActions('Transfer salmon to grill')).toBe(true);
      expect(cleaner.containsCookingActions('Cook until done')).toBe(true);
      expect(cleaner.containsCookingActions('Mix ingredients together')).toBe(true);
    });

    it('should accept long non-comment, non-HTML text', function() {
      const longCookingText = 'This is a longer cooking instruction that describes the cooking process in detail';
      expect(cleaner.containsCookingActions(longCookingText)).toBe(true);
    });

    it('should reject comment-like content', function() {
      expect(cleaner.containsCookingActions('John says this recipe is great')).toBe(false);
    });

    it('should reject HTML content', function() {
      expect(cleaner.containsCookingActions('<img src="test.jpg">')).toBe(false);
    });
  });

  describe('cleanIngredients', function() {
    it('should filter and clean ingredient list', function() {
      const rawIngredients = [
        '2 cups flour',
        '1 tsp salt',
        '<img src="bad.jpg">',  // Should be filtered
        'Transfer salmon to smoker',  // Should be filtered
        'soy sauce',
        ''  // Empty should be filtered
      ];

      const cleaned = cleaner.cleanIngredients(rawIngredients);
      
      expect(cleaned.length).toBe(3);
      expect(cleaned).toContain('2 cups flour');
      expect(cleaned).toContain('1 tsp salt');
      expect(cleaned).toContain('soy sauce');
      expect(cleaned).not.toContain('<img src="bad.jpg">');
      expect(cleaned).not.toContain('Transfer salmon to smoker');
    });
  });

  describe('cleanInstructions', function() {
    it('should filter and clean instruction list', function() {
      const rawInstructions = [
        { text: 'Heat the smoker to 225°F' },
        'Mix ingredients together',
        'John says this is great',  // Should be filtered
        { text: 'Cook until done' },
        '<img src="step.jpg">',  // Should be filtered
        ''  // Empty should be filtered
      ];

      const cleaned = cleaner.cleanInstructions(rawInstructions);
      
      expect(cleaned.length).toBe(3);
      expect(cleaned).toContain('Heat the smoker to 225°F');
      expect(cleaned).toContain('Mix ingredients together');
      expect(cleaned).toContain('Cook until done');
      expect(cleaned).not.toContain('John says this is great');
    });
  });

  describe('cleanRecipeData - comprehensive', function() {
    it('should handle complex contaminated data', function() {
      const contaminatedData = {
        name: 'Contaminated Recipe',
        description: 'A recipe with contaminated data',
        image: [
          'https://example.com/good-image.jpg',
          'https://example.com/bad-image.jpg'
        ],
        recipeIngredient: [
          '2 cups flour',
          '1 tsp salt',
          '<img src="contaminated.jpg" class="recipe-image">',  // HTML contamination
          'Transfer the mixture to a bowl and let it rest',  // Instruction contamination
          'John says: This ingredient is optional',  // Comment contamination
          '3 eggs'
        ],
        recipeInstructions: [
          { text: 'Preheat oven to 350°F' },
          'Mix dry ingredients together',
          'Reply to @user: Thanks for the recipe!',  // Comment contamination
          '<img src="step1.jpg" alt="mixing bowl">',  // HTML contamination
          { text: 'Bake for 25-30 minutes until golden' },
          'What temperature should I use for this step?',  // Question contamination
          'Cook until internal temperature reaches 165°F'
        ],
        author: [
          { name: 'Chef John' },
          { name: 'Contaminated Author' }
        ]
      };

      const cleaned = cleaner.cleanRecipeData(contaminatedData);

      expect(cleaned.title).toBe('Contaminated Recipe');
      expect(cleaned.image).toBe('https://example.com/good-image.jpg');
      expect(cleaned.author).toBe('Chef John');

      // Should filter out contaminated ingredients
      expect(cleaned.ingredients).toEqual(['2 cups flour', '1 tsp salt', '3 eggs']);
      expect(cleaned.ingredients).not.toContain('Transfer the mixture to a bowl');
      expect(cleaned.ingredients).not.toContain('John says: This ingredient is optional');

      // Should filter out contaminated instructions
      expect(cleaned.instructions.length).toBeGreaterThan(3);
      expect(cleaned.instructions).toContain('Preheat oven to 350°F');
      expect(cleaned.instructions).toContain('Mix dry ingredients together');
      expect(cleaned.instructions).toContain('Cook until internal temperature reaches 165°F');
      expect(cleaned.instructions).not.toContain('Reply to @user: Thanks for the recipe!');
      expect(cleaned.instructions).not.toContain('What temperature should I use for this step?');
    });
  });
});