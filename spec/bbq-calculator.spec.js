const BBQCalculator = require('../js/bbq-calculator.js');

describe('BBQCalculator', function() {
  let calculator;

  beforeEach(function() {
    calculator = new BBQCalculator();
  });

  describe('calculateCookTime', function() {
    it('should calculate cook time for brisket correctly', function() {
      const result = calculator.calculateCookTime(14, 'brisket');
      expect(result.timeHours).toBe(17.5);
      expect(result.description).toContain('17.5 hours at 250°F');
    });

    it('should calculate cook time for pork shoulder correctly', function() {
      const result = calculator.calculateCookTime(8, 'pork_shoulder');
      expect(result.timeHours).toBe(12);
      expect(result.description).toContain('12.0 hours at 225°F');
    });

    it('should return fixed time for ribs regardless of weight', function() {
      const result1 = calculator.calculateCookTime(3, 'ribs');
      const result2 = calculator.calculateCookTime(5, 'ribs');
      expect(result1.timeHours).toBe(5.5);
      expect(result2.timeHours).toBe(5.5);
      expect(result1.description).toContain('5-6 hours total using 3-2-1 method');
    });

    it('should return fixed time for whole chicken', function() {
      const result = calculator.calculateCookTime(4, 'whole_chicken');
      expect(result.timeHours).toBe(3.5);
      expect(result.description).toContain('3-4 hours at 325°F');
    });

    it('should throw error for invalid weight', function() {
      expect(function() {
        calculator.calculateCookTime(0, 'brisket');
      }).toThrowError('Invalid weight or meat type provided');

      expect(function() {
        calculator.calculateCookTime(-5, 'brisket');
      }).toThrowError('Invalid weight or meat type provided');

      expect(function() {
        calculator.calculateCookTime(null, 'brisket');
      }).toThrowError('Invalid weight or meat type provided');
    });

    it('should throw error for invalid meat type', function() {
      expect(function() {
        calculator.calculateCookTime(10, 'invalid_meat');
      }).toThrowError('Unsupported meat type: invalid_meat');

      expect(function() {
        calculator.calculateCookTime(10, null);
      }).toThrowError('Invalid weight or meat type provided');
    });

    it('should round time hours to 1 decimal place', function() {
      const result = calculator.calculateCookTime(7, 'brisket');
      expect(result.timeHours).toBe(8.8);
    });
  });

  describe('getTemperatureGuide', function() {
    it('should return temperature guide for brisket', function() {
      const result = calculator.getTemperatureGuide('brisket');
      expect(result.smoker).toBe('250°F ±5°F');
      expect(result.targetInternal).toBe('203°F probe tender');
      expect(result.wrapPoint).toBe('165°F (Texas Crutch)');
      expect(result.formatted).toContain('<strong>Smoker:</strong>');
    });

    it('should return temperature guide for ribs', function() {
      const result = calculator.getTemperatureGuide('ribs');
      expect(result.smoker).toBe('225°F ±3°F');
      expect(result.targetInternal).toBe('195-203°F');
      expect(result.wrapPoint).toBe('After 3 hours (3-2-1 method)');
    });

    it('should return temperature guide for pork shoulder', function() {
      const result = calculator.getTemperatureGuide('pork_shoulder');
      expect(result.smoker).toBe('225°F');
      expect(result.targetInternal).toBe('203-205°F');
      expect(result.wrapPoint).toBe('165°F (optional)');
    });

    it('should return temperature guide for chicken', function() {
      const result = calculator.getTemperatureGuide('chicken');
      expect(result.smoker).toBe('325°F (crispy skin)');
      expect(result.targetInternal).toBe('165°F breast, 175°F thigh');
      expect(result.wrapPoint).toBe('No Wrapping: Maintain skin integrity');
    });

    it('should throw error for invalid meat type', function() {
      expect(function() {
        calculator.getTemperatureGuide('invalid_meat');
      }).toThrowError('Unsupported meat type: invalid_meat');

      expect(function() {
        calculator.getTemperatureGuide(null);
      }).toThrowError('Meat type is required');

      expect(function() {
        calculator.getTemperatureGuide('');
      }).toThrowError('Meat type is required');
    });
  });

  describe('getWoodPairing', function() {
    it('should return wood pairing for brisket', function() {
      const result = calculator.getWoodPairing('brisket');
      expect(result.primary).toBe('Post Oak (80%)');
      expect(result.secondary).toBe('Hickory (20%)');
      expect(result.profile).toBe('Bold, traditional Texas flavor');
      expect(result.formatted).toContain('<strong>Primary:</strong>');
    });

    it('should return wood pairing for ribs', function() {
      const result = calculator.getWoodPairing('ribs');
      expect(result.primary).toBe('Apple (60%)');
      expect(result.secondary).toBe('Cherry (40%)');
      expect(result.profile).toBe('Sweet, mild, great color');
    });

    it('should return wood pairing for pork', function() {
      const result = calculator.getWoodPairing('pork');
      expect(result.primary).toBe('Hickory (70%)');
      expect(result.secondary).toBe('Apple (30%)');
      expect(result.profile).toBe('Classic BBQ flavor, not overpowering');
    });

    it('should return wood pairing for chicken', function() {
      const result = calculator.getWoodPairing('chicken');
      expect(result.primary).toBe('Apple or Cherry');
      expect(result.secondary).toBe('Avoid: Mesquite (too strong)');
      expect(result.profile).toBe('Light, fruity, delicate');
    });

    it('should return wood pairing for fish', function() {
      const result = calculator.getWoodPairing('fish');
      expect(result.primary).toBe('Cedar planks or Alder');
      expect(result.secondary).toBe('Apple (light application)');
      expect(result.profile).toBe('Very mild, complementary');
    });

    it('should throw error for invalid meat type', function() {
      expect(function() {
        calculator.getWoodPairing('invalid_meat');
      }).toThrowError('Unsupported meat type: invalid_meat');

      expect(function() {
        calculator.getWoodPairing(null);
      }).toThrowError('Meat type is required');
    });
  });

  describe('calculateRub', function() {
    it('should calculate enhanced rub for brisket with medium coverage', function() {
      const result = calculator.calculateRub('brisket', 14, 1, 'texas', 'medium');
      expect(result.meatType).toBe('brisket');
      expect(result.weight).toBe(14);
      expect(result.numberOfCuts).toBe(1);
      expect(result.rubType).toBe('texas');
      expect(result.coverage).toBe('medium');
      expect(result.totalRubNeeded).toBe(21); // 14 * 1.5
      expect(result.ingredients).toHaveSize(2);
      expect(result.ingredients[0].name).toBe('Coarse kosher salt');
    });

    it('should calculate enhanced rub for ribs with heavy coverage', function() {
      const result = calculator.calculateRub('ribs', 6, 2, 'memphis', 'heavy');
      expect(result.meatType).toBe('ribs');
      expect(result.weight).toBe(6);
      expect(result.coverage).toBe('heavy');
      expect(result.totalRubNeeded).toBe(15); // 6 * 2.0 * 1.25
      expect(result.ingredients).toHaveSize(5);
    });

    it('should calculate enhanced rub for chicken with light coverage', function() {
      const result = calculator.calculateRub('chicken', 4, 2, 'carolina', 'light');
      expect(result.meatType).toBe('chicken');
      expect(result.coverage).toBe('light');
      expect(result.totalRubNeeded).toBe(3); // 4 * 1.0 * 0.75
    });

    it('should default to medium coverage when not specified', function() {
      const result = calculator.calculateRub('pork_shoulder', 8, 1, 'competition');
      expect(result.coverage).toBe('medium');
      expect(result.totalRubNeeded).toBe(12); // 8 * 1.5 * 1.0
    });

    it('should calculate per pound amounts correctly', function() {
      const result = calculator.calculateRub('brisket', 10, 1, 'texas', 'medium');
      result.ingredients.forEach(ingredient => {
        expect(ingredient.perPound).toBeCloseTo(ingredient.amount / 10, 2);
      });
    });

    it('should throw error for invalid parameters', function() {
      expect(function() {
        calculator.calculateRub('', 10, 1, 'texas');
      }).toThrowError('Invalid parameters: meat type, weight, number of cuts, and rub type are required');

      expect(function() {
        calculator.calculateRub('brisket', 0, 1, 'texas');
      }).toThrowError('Invalid parameters: meat type, weight, number of cuts, and rub type are required');

      expect(function() {
        calculator.calculateRub('brisket', 10, 0, 'texas');
      }).toThrowError('Invalid parameters: meat type, weight, number of cuts, and rub type are required');

      expect(function() {
        calculator.calculateRub('brisket', 10, 1, '');
      }).toThrowError('Invalid parameters: meat type, weight, number of cuts, and rub type are required');
    });

    it('should throw error for invalid rub type', function() {
      expect(function() {
        calculator.calculateRub('brisket', 10, 1, 'invalid_rub');
      }).toThrowError('Unsupported rub type: invalid_rub');
    });

    it('should include enhanced formatted output', function() {
      const result = calculator.calculateRub('brisket', 12, 1, 'texas', 'heavy');
      expect(result.formatted).toContain('Rub Recipe for 12 lb brisket (heavy coverage)');
      expect(result.formatted).toContain('Total amounts needed:');
      expect(result.formatted).toContain('Per pound breakdown:');
      expect(result.formatted).toContain('Application:');
    });
  });

  describe('formatRubCalculation', function() {
    it('should format rub calculation correctly', function() {
      const ingredients = [
        { name: 'Salt', amount: 4, unit: 'Tbsp', perCut: 2 },
        { name: 'Pepper', amount: 4, unit: 'Tbsp', perCut: 2 }
      ];
      const formatted = calculator.formatRubCalculation(ingredients, 2);
      
      expect(formatted).toContain('<strong>Per rack/cut:</strong>');
      expect(formatted).toContain('• Salt: 2 Tbsp');
      expect(formatted).toContain('• Pepper: 2 Tbsp');
      expect(formatted).toContain('<strong>Total for 2:</strong>');
    });
  });
});