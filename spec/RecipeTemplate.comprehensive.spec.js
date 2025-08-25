const RecipeTemplate = require('../js/RecipeTemplate');
const Recipe = require('../js/Recipe');

describe('RecipeTemplate - Comprehensive', function() {
  let template;
  let sampleRecipe;

  beforeEach(function() {
    template = new RecipeTemplate();
    sampleRecipe = new Recipe({
      title: 'Test Recipe',
      description: 'A comprehensive test recipe',
      image: 'https://example.com/test.jpg',
      prepTime: 'PT15M',
      cookTime: 'PT30M',
      servings: '4',
      ingredients: ['2 cups flour', '1 tsp salt'],
      instructions: ['Mix ingredients', 'Bake until done'],
      author: 'Test Chef',
      sourceUrl: 'https://example.com/recipe'
    });
  });

  describe('render', function() {
    it('should generate complete HTML document', function() {
      const html = template.render(sampleRecipe);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('Test Recipe');
    });

    it('should include all major sections', function() {
      const html = template.render(sampleRecipe);
      
      expect(html).toContain('back-button');
      expect(html).toContain('recipe-header');
      expect(html).toContain('source-info');
      expect(html).toContain('recipe-grid');
    });
  });

  describe('renderHead', function() {
    it('should include proper meta tags', function() {
      const head = template.renderHead(sampleRecipe);
      
      expect(head).toContain('<meta charset="UTF-8">');
      expect(head).toContain('<meta name="viewport"');
      expect(head).toContain('<title>Test Recipe - Reeves BBQ Co.</title>');
    });

    it('should include Shoelace CSS and JS', function() {
      const head = template.renderHead(sampleRecipe);
      
      expect(head).toContain('shoelace-style/shoelace');
      expect(head).toContain('shoelace-autoloader.js');
    });

    it('should include styles', function() {
      const head = template.renderHead(sampleRecipe);
      
      expect(head).toContain('<style>');
      expect(head).toContain('body {');
    });

    it('should escape HTML in title', function() {
      const maliciousRecipe = new Recipe({ title: '<script>alert("xss")</script>' });
      const head = template.renderHead(maliciousRecipe);
      
      expect(head).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(head).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('renderStyles', function() {
    it('should return CSS styles string', function() {
      const styles = template.renderStyles();
      
      expect(styles).toContain('<style>');
      expect(styles).toContain('</style>');
      expect(styles).toContain('body {');
      expect(styles).toContain('.container {');
      expect(styles).toContain('.recipe-header {');
    });
  });

  describe('renderBackButton', function() {
    it('should generate back button HTML', function() {
      const backButton = template.renderBackButton();
      
      expect(backButton).toContain('back-button');
      expect(backButton).toContain('sl-button');
      expect(backButton).toContain('href="../index.html"');
      expect(backButton).toContain('Back to Championship Collection');
      expect(backButton).toContain('arrow-left');
    });
  });

  describe('renderHeader', function() {
    it('should render recipe title and image', function() {
      const header = template.renderHeader(sampleRecipe);
      
      expect(header).toContain('recipe-header');
      expect(header).toContain('Test Recipe');
      expect(header).toContain('https://example.com/test.jpg');
      expect(header).toContain('recipe-image');
    });

    it('should handle recipe without image', function() {
      const noImageRecipe = new Recipe({ title: 'No Image Recipe' });
      const header = template.renderHeader(noImageRecipe);
      
      expect(header).toContain('No Image Recipe');
      expect(header).not.toContain('<img');
    });

    it('should escape HTML in title and alt text', function() {
      const maliciousRecipe = new Recipe({
        title: '<script>alert("xss")</script>',
        image: 'https://example.com/image.jpg'
      });
      const header = template.renderHeader(maliciousRecipe);
      
      expect(header).toContain('&lt;script&gt;');
      expect(header).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('renderSourceInfo', function() {
    it('should render source attribution when URL exists', function() {
      const sourceInfo = template.renderSourceInfo(sampleRecipe);
      
      expect(sourceInfo).toContain('source-info');
      expect(sourceInfo).toContain('Recipe Source');
      expect(sourceInfo).toContain('example.com');
      expect(sourceInfo).toContain('Test Chef');
      expect(sourceInfo).toContain('View Original Recipe');
    });

    it('should return empty string when no source URL', function() {
      const noSourceRecipe = new Recipe({ title: 'No Source Recipe' });
      const sourceInfo = template.renderSourceInfo(noSourceRecipe);
      
      expect(sourceInfo).toBe('');
    });

    it('should handle author-less recipes', function() {
      const noAuthorRecipe = new Recipe({
        title: 'No Author Recipe',
        sourceUrl: 'https://example.com/recipe'
      });
      const sourceInfo = template.renderSourceInfo(noAuthorRecipe);
      
      expect(sourceInfo).toContain('example.com');
      expect(sourceInfo).not.toContain(' by ');
    });
  });

  describe('renderAboutSection', function() {
    it('should render description when present', function() {
      const aboutSection = template.renderAboutSection(sampleRecipe);
      
      expect(aboutSection).toContain('About This Recipe');
      expect(aboutSection).toContain('A comprehensive test recipe');
      expect(aboutSection).toContain('sl-card');
    });

    it('should return empty string when no description', function() {
      const noDescRecipe = new Recipe({ title: 'No Description Recipe' });
      const aboutSection = template.renderAboutSection(noDescRecipe);
      
      expect(aboutSection).toBe('');
    });
  });

  describe('renderMainContent', function() {
    it('should render recipe grid with all cards', function() {
      const mainContent = template.renderMainContent(sampleRecipe);
      
      expect(mainContent).toContain('recipe-grid');
      expect(mainContent).toContain('Recipe Details');
      expect(mainContent).toContain('Ingredients');
      expect(mainContent).toContain('Instructions');
    });
  });

  describe('renderDetailsCard', function() {
    it('should render timing information when present', function() {
      const detailsCard = template.renderDetailsCard(sampleRecipe);
      
      expect(detailsCard).toContain('Recipe Details');
      expect(detailsCard).toContain('Cooking Information');
      expect(detailsCard).toContain('PT15M');
      expect(detailsCard).toContain('PT30M');
      expect(detailsCard).toContain('4');
    });

    it('should return empty string when no timing info', function() {
      const noTimingRecipe = new Recipe({ title: 'No Timing Recipe' });
      const detailsCard = template.renderDetailsCard(noTimingRecipe);
      
      expect(detailsCard).toBe('');
    });

    it('should handle partial timing information', function() {
      const partialRecipe = new Recipe({
        title: 'Partial Recipe',
        prepTime: 'PT15M'
      });
      const detailsCard = template.renderDetailsCard(partialRecipe);
      
      expect(detailsCard).toContain('PT15M');
      expect(detailsCard).not.toContain('Cook:');
      expect(detailsCard).not.toContain('Serves:');
    });
  });

  describe('renderIngredientsCard', function() {
    it('should render ingredients list when present', function() {
      const ingredientsCard = template.renderIngredientsCard(sampleRecipe);
      
      expect(ingredientsCard).toContain('Ingredients');
      expect(ingredientsCard).toContain('Shopping List');
      expect(ingredientsCard).toContain('2 cups flour');
      expect(ingredientsCard).toContain('1 tsp salt');
      expect(ingredientsCard).toContain('<ul>');
    });

    it('should show message when no ingredients', function() {
      const noIngredientsRecipe = new Recipe({ title: 'No Ingredients Recipe' });
      const ingredientsCard = template.renderIngredientsCard(noIngredientsRecipe);
      
      expect(ingredientsCard).toContain('Ingredients');
      expect(ingredientsCard).toContain('No ingredients found');
      expect(ingredientsCard).not.toContain('<ul>');
    });

    it('should escape HTML in ingredients', function() {
      const maliciousRecipe = new Recipe({
        title: 'Malicious Recipe',
        ingredients: ['<script>alert("xss")</script>', '2 cups flour']
      });
      const ingredientsCard = template.renderIngredientsCard(maliciousRecipe);
      
      expect(ingredientsCard).toContain('&lt;script&gt;');
      expect(ingredientsCard).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('renderInstructionsCard', function() {
    it('should render instructions list when present', function() {
      const instructionsCard = template.renderInstructionsCard(sampleRecipe);
      
      expect(instructionsCard).toContain('Instructions');
      expect(instructionsCard).toContain('Cooking Steps');
      expect(instructionsCard).toContain('Mix ingredients');
      expect(instructionsCard).toContain('Bake until done');
      expect(instructionsCard).toContain('<ol>');
    });

    it('should show message when no instructions', function() {
      const noInstructionsRecipe = new Recipe({ title: 'No Instructions Recipe' });
      const instructionsCard = template.renderInstructionsCard(noInstructionsRecipe);
      
      expect(instructionsCard).toContain('Instructions');
      expect(instructionsCard).toContain('No instructions found');
      expect(instructionsCard).not.toContain('<ol>');
    });

    it('should escape HTML in instructions', function() {
      const maliciousRecipe = new Recipe({
        title: 'Malicious Recipe',
        instructions: ['<script>alert("xss")</script>', 'Mix ingredients']
      });
      const instructionsCard = template.renderInstructionsCard(maliciousRecipe);
      
      expect(instructionsCard).toContain('&lt;script&gt;');
      expect(instructionsCard).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('escapeHtml', function() {
    it('should escape all HTML characters', function() {
      expect(template.escapeHtml('<script>alert("test")</script>'))
        .toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(template.escapeHtml('Salt & Pepper')).toBe('Salt &amp; Pepper');
      expect(template.escapeHtml("Mom's Recipe")).toBe('Mom&#39;s Recipe');
      expect(template.escapeHtml('Price: $5 > $4')).toBe('Price: $5 &gt; $4');
    });

    it('should handle empty and null values', function() {
      expect(template.escapeHtml('')).toBe('');
      expect(template.escapeHtml(null)).toBe('');
      expect(template.escapeHtml(undefined)).toBe('');
    });

    it('should convert non-strings to strings', function() {
      expect(template.escapeHtml(123)).toBe('123');
      expect(template.escapeHtml(true)).toBe('true');
    });
  });
});