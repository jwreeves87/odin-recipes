class BBQCalculator {
  constructor() {
    this.meatTypes = {
      brisket: { timePerLb: 1.25, temperature: 250 },
      ribs: { fixedTime: 5.5, temperature: 225 },
      pork_shoulder: { timePerLb: 1.5, temperature: 225 },
      whole_chicken: { fixedTime: 3.5, temperature: 325 }
    };

    this.temperatureGuides = {
      brisket: {
        smoker: '250°F ±5°F',
        targetInternal: '203°F probe tender',
        wrapPoint: '165°F (Texas Crutch)'
      },
      ribs: {
        smoker: '225°F ±3°F',
        targetInternal: '195-203°F',
        wrapPoint: 'After 3 hours (3-2-1 method)'
      },
      pork_shoulder: {
        smoker: '225°F',
        targetInternal: '203-205°F',
        wrapPoint: '165°F (optional)'
      },
      chicken: {
        smoker: '325°F (crispy skin)',
        targetInternal: '165°F breast, 175°F thigh',
        wrapPoint: 'No Wrapping: Maintain skin integrity'
      }
    };

    this.woodPairings = {
      brisket: {
        primary: 'Post Oak (80%)',
        secondary: 'Hickory (20%)',
        profile: 'Bold, traditional Texas flavor'
      },
      ribs: {
        primary: 'Apple (60%)',
        secondary: 'Cherry (40%)',
        profile: 'Sweet, mild, great color'
      },
      pork: {
        primary: 'Hickory (70%)',
        secondary: 'Apple (30%)',
        profile: 'Classic BBQ flavor, not overpowering'
      },
      chicken: {
        primary: 'Apple or Cherry',
        secondary: 'Avoid: Mesquite (too strong)',
        profile: 'Light, fruity, delicate'
      },
      fish: {
        primary: 'Cedar planks or Alder',
        secondary: 'Apple (light application)',
        profile: 'Very mild, complementary'
      }
    };

    this.rubTypes = {
      texas: {
        ingredients: [
          { name: 'Coarse kosher salt', amount: 2, unit: 'Tbsp' },
          { name: 'Cracked black pepper', amount: 2, unit: 'Tbsp' }
        ]
      },
      competition: {
        ingredients: [
          { name: 'Brown sugar', amount: 3, unit: 'Tbsp' },
          { name: 'Paprika', amount: 2, unit: 'Tbsp' },
          { name: 'Salt', amount: 1, unit: 'Tbsp' },
          { name: 'Various spices', amount: 1, unit: 'Tbsp' }
        ]
      },
      memphis: {
        ingredients: [
          { name: 'Paprika', amount: 2, unit: 'Tbsp' },
          { name: 'Garlic powder', amount: 1, unit: 'Tbsp' },
          { name: 'Onion powder', amount: 1, unit: 'Tbsp' },
          { name: 'Salt', amount: 1, unit: 'Tbsp' },
          { name: 'Pepper', amount: 1, unit: 'Tbsp' }
        ]
      },
      carolina: {
        ingredients: [
          { name: 'Brown sugar', amount: 2, unit: 'Tbsp' },
          { name: 'Paprika', amount: 2, unit: 'Tbsp' },
          { name: 'Mustard powder', amount: 1, unit: 'Tbsp' },
          { name: 'Cayenne', amount: 1, unit: 'tsp' }
        ]
      }
    };
  }

  calculateCookTime(weight, meatType) {
    if (!weight || !meatType || weight <= 0) {
      throw new Error('Invalid weight or meat type provided');
    }

    const meatConfig = this.meatTypes[meatType];
    if (!meatConfig) {
      throw new Error(`Unsupported meat type: ${meatType}`);
    }

    let timeHours;
    let description;

    if (meatConfig.fixedTime) {
      timeHours = meatConfig.fixedTime;
      switch(meatType) {
        case 'ribs':
          description = `5-6 hours total using 3-2-1 method<br>Weight doesn't significantly affect time`;
          break;
        case 'whole_chicken':
          description = `3-4 hours at 325°F<br>Higher temp for crispy skin`;
          break;
      }
    } else {
      timeHours = weight * meatConfig.timePerLb;
      switch(meatType) {
        case 'brisket':
          description = `${timeHours.toFixed(1)} hours at 250°F<br>Start early morning for evening service`;
          break;
        case 'pork_shoulder':
          description = `${timeHours.toFixed(1)} hours at 225°F<br>Allow extra time for resting`;
          break;
      }
    }

    return {
      timeHours: parseFloat(timeHours.toFixed(1)),
      description
    };
  }

  getTemperatureGuide(meatType) {
    if (!meatType) {
      throw new Error('Meat type is required');
    }

    const guide = this.temperatureGuides[meatType];
    if (!guide) {
      throw new Error(`Unsupported meat type: ${meatType}`);
    }

    return {
      smoker: guide.smoker,
      targetInternal: guide.targetInternal,
      wrapPoint: guide.wrapPoint,
      formatted: `<strong>Smoker:</strong> ${guide.smoker}<br>
                  <strong>Target Internal:</strong> ${guide.targetInternal}<br>
                  <strong>Wrap Point:</strong> ${guide.wrapPoint}`
    };
  }

  getWoodPairing(meatType) {
    if (!meatType) {
      throw new Error('Meat type is required');
    }

    const pairing = this.woodPairings[meatType];
    if (!pairing) {
      throw new Error(`Unsupported meat type: ${meatType}`);
    }

    return {
      primary: pairing.primary,
      secondary: pairing.secondary,
      profile: pairing.profile,
      formatted: `<strong>Primary:</strong> ${pairing.primary}<br>
                  <strong>Secondary:</strong> ${pairing.secondary}<br>
                  <strong>Profile:</strong> ${pairing.profile}`
    };
  }

  calculateRub(meatType, weight, numberOfCuts, rubType, coverage = 'medium') {
    if (!meatType || !weight || !numberOfCuts || !rubType || weight <= 0 || numberOfCuts <= 0) {
      throw new Error('Invalid parameters: meat type, weight, number of cuts, and rub type are required');
    }

    const rub = this.rubTypes[rubType];
    if (!rub) {
      throw new Error(`Unsupported rub type: ${rubType}`);
    }

    // Coverage multipliers
    const coverageMultipliers = {
      light: 0.75,
      medium: 1.0,
      heavy: 1.25
    };

    const coverageMultiplier = coverageMultipliers[coverage] || 1.0;

    // Base amount per pound (varies by meat type)
    const baseAmountPerPound = {
      brisket: 1.5, // tbsp per pound
      ribs: 2.0,
      pork_shoulder: 1.5,
      chicken: 1.0,
      turkey: 1.0
    };

    const meatMultiplier = baseAmountPerPound[meatType] || 1.5;

    // Calculate total rub needed based on weight and coverage
    const totalRubNeeded = weight * meatMultiplier * coverageMultiplier;

    // Calculate scaled ingredients
    const scaledIngredients = rub.ingredients.map(ingredient => {
      // Calculate proportion of this ingredient in the total rub
      const totalBaseAmount = rub.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
      const proportion = ingredient.amount / totalBaseAmount;
      const totalAmount = totalRubNeeded * proportion;
      
      return {
        name: ingredient.name,
        amount: parseFloat(totalAmount.toFixed(2)),
        unit: ingredient.unit,
        perPound: parseFloat((totalAmount / weight).toFixed(2))
      };
    });

    const formatted = this.formatEnhancedRubCalculation(scaledIngredients, meatType, weight, numberOfCuts, coverage);

    return {
      ingredients: scaledIngredients,
      meatType,
      weight,
      numberOfCuts,
      rubType,
      coverage,
      totalRubNeeded: parseFloat(totalRubNeeded.toFixed(2)),
      formatted
    };
  }

  formatRubCalculation(ingredients, quantity) {
    let formatted = '<strong>Per rack/cut:</strong><br>';
    ingredients.forEach(ingredient => {
      formatted += `• ${ingredient.name}: ${ingredient.perCut} ${ingredient.unit}<br>`;
    });
    formatted += `<strong>Total for ${quantity}:</strong> Scale all amounts by ${quantity}`;
    return formatted;
  }

  formatEnhancedRubCalculation(ingredients, meatType, weight, numberOfCuts, coverage) {
    let formatted = `<strong>Rub Recipe for ${weight} lb ${meatType.replace('_', ' ')} (${coverage} coverage):</strong><br><br>`;
    
    formatted += '<strong>Total amounts needed:</strong><br>';
    ingredients.forEach(ingredient => {
      formatted += `• ${ingredient.name}: ${ingredient.amount} ${ingredient.unit}<br>`;
    });
    
    formatted += '<br><strong>Per pound breakdown:</strong><br>';
    ingredients.forEach(ingredient => {
      formatted += `• ${ingredient.name}: ${ingredient.perPound} ${ingredient.unit} per lb<br>`;
    });
    
    formatted += `<br><strong>Application:</strong> This recipe covers ${numberOfCuts} cut(s) of ${weight} lb total weight with ${coverage} coverage.`;
    
    return formatted;
  }
}

// Make it available globally and for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BBQCalculator;
} else if (typeof window !== 'undefined') {
  window.BBQCalculator = BBQCalculator;
}