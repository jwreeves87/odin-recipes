const RecipeGenerator = require('../js/RecipeGenerator');

describe('RecipeGenerator - Comprehensive', function() {
  let generator;

  beforeEach(function() {
    generator = new RecipeGenerator();
  });

  describe('constructor', function() {
    it('should initialize with RecipeTemplate instance', function() {
      expect(generator.template).toBeDefined();
      expect(typeof generator.template.render).toBe('function');
    });
  });

  describe('generate', function() {
    it('should generate HTML and filename for valid recipe data', function() {
      const recipeData = {
        title: 'Test Recipe',
        description: 'A test recipe for generation',
        ingredients: ['2 cups flour', '1 tsp salt'],
        instructions: ['Mix ingredients', 'Bake for 30 minutes'],
        prepTime: 'PT15M',
        cookTime: 'PT30M',
        servings: '4',
        author: 'Test Chef',
        sourceUrl: 'https://example.com/recipe'
      };

      const result = generator.generate(recipeData);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.filename).toBeDefined();

      expect(typeof result.html).toBe('string');
      expect(typeof result.filename).toBe('string');

      expect(result.html).toContain('Test Recipe');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('</html>');

      expect(result.filename).toBe('testrecipe.html');
      expect(result.filename).toMatch(/^[a-z0-9]+\.html$/);
    });

    it('should handle minimal recipe data', function() {
      const minimalData = {
        title: 'Minimal Recipe'
      };

      const result = generator.generate(minimalData);

      expect(result.html).toContain('Minimal Recipe');
      expect(result.filename).toBe('minimalrecipe.html');
      expect(result.html).toContain('<!DOCTYPE html>');
    });

    it('should handle recipe with special characters in title', function() {
      const specialData = {
        title: 'Mom\'s "Special" BBQ & Ribs!'
      };

      const result = generator.generate(specialData);

      expect(result.html).toContain('Mom&#39;s &quot;Special&quot; BBQ &amp; Ribs!');
      expect(result.filename).toBe('momsspecialbbqribs.html');
    });

    it('should handle empty recipe data', function() {
      const result = generator.generate({});

      expect(result.html).toContain('Untitled Recipe');
      expect(result.filename).toBe('untitledrecipe.html');
    });

    it('should handle null/undefined recipe data', function() {
      const resultNull = generator.generate(null);
      const resultUndefined = generator.generate(undefined);

      expect(resultNull.html).toContain('Untitled Recipe');
      expect(resultNull.filename).toBe('untitledrecipe.html');

      expect(resultUndefined.html).toContain('Untitled Recipe');
      expect(resultUndefined.filename).toBe('untitledrecipe.html');
    });

    it('should generate complete HTML structure', function() {
      const complexData = {
        title: 'Complex BBQ Recipe',
        description: 'A complex recipe with all fields populated',
        image: 'https://example.com/bbq.jpg',
        prepTime: 'PT30M',
        cookTime: 'PT6H',
        servings: '8',
        ingredients: [
          '5 lb beef brisket',
          '2 tbsp brown sugar',
          '1 tbsp paprika',
          '2 tsp salt',
          '1 tsp black pepper'
        ],
        instructions: [
          'Prepare the rub by mixing dry ingredients',
          'Rub the brisket with the spice mixture',
          'Smoke at 225°F for 6 hours',
          'Rest for 30 minutes before slicing'
        ],
        author: 'Pitmaster Joe',
        sourceUrl: 'https://bbqmasters.com/brisket-recipe'
      };

      const result = generator.generate(complexData);

      // Check HTML structure
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body>');
      expect(result.html).toContain('</html>');

      // Check content
      expect(result.html).toContain('Complex BBQ Recipe');
      expect(result.html).toContain('A complex recipe with all fields populated');
      expect(result.html).toContain('https://example.com/bbq.jpg');
      expect(result.html).toContain('5 lb beef brisket');
      expect(result.html).toContain('Smoke at 225°F for 6 hours');
      expect(result.html).toContain('Pitmaster Joe');
      expect(result.html).toContain('bbqmasters.com');

      // Check filename
      expect(result.filename).toBe('complexbbqrecipe.html');
    });

    it('should handle arrays in recipe data', function() {
      const arrayData = {
        title: 'Array Test Recipe',
        ingredients: [
          '2 cups flour',
          '1 tsp salt',
          '3 eggs'
        ],
        instructions: [
          'Step 1: Mix dry ingredients',
          'Step 2: Add eggs',
          'Step 3: Bake until golden'
        ]
      };

      const result = generator.generate(arrayData);

      expect(result.html).toContain('2 cups flour');
      expect(result.html).toContain('1 tsp salt');
      expect(result.html).toContain('3 eggs');
      expect(result.html).toContain('Step 1: Mix dry ingredients');
      expect(result.html).toContain('Step 2: Add eggs');
      expect(result.html).toContain('Step 3: Bake until golden');
    });

    it('should sanitize malicious content', function() {
      const maliciousData = {
        title: '<script>alert("xss")</script>Malicious Recipe',
        description: '<img src="x" onerror="alert(1)">Bad description',
        ingredients: [
          '<script>alert("ingredient")</script>2 cups flour',
          'Normal ingredient'
        ],
        instructions: [
          '<script>alert("instruction")</script>Mix ingredients',
          'Normal instruction'
        ]
      };

      const result = generator.generate(maliciousData);

      // Should escape malicious content
      expect(result.html).not.toContain('<script>alert("xss")</script>');
      expect(result.html).not.toContain('<img src="x" onerror="alert(1)">');
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('&lt;img');

      // Should preserve normal content
      expect(result.html).toContain('Malicious Recipe');
      expect(result.html).toContain('Bad description');
      expect(result.html).toContain('2 cups flour');
      expect(result.html).toContain('Normal ingredient');
    });
  });
});