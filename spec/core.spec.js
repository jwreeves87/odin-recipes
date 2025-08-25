const Recipe = require('../js/Recipe');
const RecipeDataCleaner = require('../js/RecipeDataCleaner');
const IndexPageUpdater = require('../js/IndexPageUpdater');

describe('Core Recipe System', function() {
  
  describe('Recipe Class', function() {
    it('should create recipe with default values', function() {
      const recipe = new Recipe();
      expect(recipe.title).toBe('Untitled Recipe');
      expect(recipe.ingredients).toEqual([]);
    });

    it('should create recipe with provided data', function() {
      const data = {
        title: 'Test Recipe',
        ingredients: ['salt', 'pepper']
      };
      const recipe = new Recipe(data);
      expect(recipe.title).toBe('Test Recipe');
      expect(recipe.ingredients).toEqual(['salt', 'pepper']);
    });

    it('should generate valid filename', function() {
      const recipe = new Recipe({ title: 'Amazing BBQ Ribs!' });
      const filename = recipe.getFilename();
      expect(filename).toBe('amazingbbqribs.html');
      expect(filename.endsWith('.html')).toBe(true);
    });

    it('should extract domain from source URL', function() {
      const recipe = new Recipe({ sourceUrl: 'https://www.foodnetwork.com/recipe' });
      expect(recipe.getSourceDomain()).toBe('foodnetwork.com');
    });
  });

  describe('RecipeDataCleaner Class', function() {
    let cleaner;

    beforeEach(function() {
      cleaner = new RecipeDataCleaner();
    });

    it('should extract image from various formats', function() {
      expect(cleaner.extractImage('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
      expect(cleaner.extractImage(['img1.jpg', 'img2.jpg'])).toBe('img1.jpg');
      expect(cleaner.extractImage({ url: 'test.jpg' })).toBe('test.jpg');
    });

    it('should extract author from various formats', function() {
      expect(cleaner.extractAuthor('John Chef')).toBe('John Chef');
      expect(cleaner.extractAuthor({ name: 'Jane Cook' })).toBe('Jane Cook');
    });

    it('should clean recipe data', function() {
      const rawData = {
        name: 'Test Recipe',
        description: 'A test recipe',
        image: 'https://example.com/image.jpg',
        recipeIngredient: ['2 cups flour', '1 tsp salt'],
        recipeInstructions: [
          { text: 'Mix ingredients' },
          'Bake for 30 minutes'
        ],
        author: { name: 'Chef John' }
      };

      const cleaned = cleaner.cleanRecipeData(rawData);

      expect(cleaned.title).toBe('Test Recipe');
      expect(cleaned.description).toBe('A test recipe');
      expect(cleaned.image).toBe('https://example.com/image.jpg');
      expect(cleaned.author).toBe('Chef John');
      expect(Array.isArray(cleaned.ingredients)).toBe(true);
      expect(Array.isArray(cleaned.instructions)).toBe(true);
    });
  });

  describe('IndexPageUpdater Class', function() {
    let updater;

    beforeEach(function() {
      updater = new IndexPageUpdater();
    });

    it('should format time strings correctly', function() {
      expect(updater.formatTime('PT30M')).toBe('30-Min Process');
      expect(updater.formatTime('PT2H')).toBe('2-Hour Process');
      expect(updater.formatTime('PT90M')).toBe('1-Hour Process');
    });

    it('should escape HTML characters', function() {
      expect(updater.escapeHtml('<script>alert("test")</script>'))
        .toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(updater.escapeHtml('Salt & Pepper')).toBe('Salt &amp; Pepper');
    });

    it('should generate recipe card HTML', function() {
      const recipeData = {
        title: 'Test Recipe',
        description: 'A test recipe',
        image: 'https://example.com/image.jpg',
        cookTime: 'PT30M'
      };

      const cardHtml = updater.generateRecipeCard(recipeData, 'test.html');

      expect(cardHtml).toContain('Test Recipe');
      expect(cardHtml).toContain('A test recipe');
      expect(cardHtml).toContain('test.html');
      expect(cardHtml).toContain('sl-card');
    });
  });

  describe('Integration', function() {
    it('should process complete recipe workflow', function() {
      // Simulate raw JSON-LD data
      const rawJsonLD = {
        name: 'Integration Test Recipe',
        description: 'Testing the full workflow',
        image: 'https://example.com/test.jpg',
        prepTime: 'PT15M',
        cookTime: 'PT30M',
        recipeYield: '4 servings',
        recipeIngredient: ['1 cup test ingredient'],
        recipeInstructions: [{ text: 'Test instruction step' }],
        author: { name: 'Test Chef' }
      };

      // Clean the data
      const cleaner = new RecipeDataCleaner();
      const cleanedData = cleaner.cleanRecipeData(rawJsonLD);

      // Create recipe object
      const recipe = new Recipe(cleanedData);

      // Verify the complete process worked
      expect(recipe.title).toBe('Integration Test Recipe');
      expect(recipe.description).toBe('Testing the full workflow');
      expect(recipe.author).toBe('Test Chef');
      expect(recipe.hasIngredients()).toBe(true);
      expect(recipe.hasInstructions()).toBe(true);

      // Verify filename generation
      const filename = recipe.getFilename();
      expect(filename).toBe('integrationtestrecipe.html');
    });
  });
});