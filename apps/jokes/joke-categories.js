(function () {
  const fallbackCategory = 'Classic Dad';

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function createKeywordTester(keywords) {
    const matchers = keywords.map((keyword) => {
      const normalized = keyword.toLowerCase();
      if (/\s/.test(normalized)) {
        return (text) => text.includes(normalized);
      }
      const pattern = new RegExp(`\\b${escapeRegExp(normalized)}\\b`);
      return (text) => pattern.test(text);
    });
    return (text) => matchers.some((matcher) => matcher(text));
  }

  const rules = [
    {
      label: 'Animals',
      matches: createKeywordTester([
        'animal',
        'beak',
        'bird',
        'cat',
        'chicken',
        'cow',
        'crab',
        'dog',
        'duck',
        'eagle',
        'elephant',
        'fish',
        'fox',
        'frog',
        'goat',
        'horse',
        'llama',
        'monkey',
        'mouse',
        'owl',
        'penguin',
        'pig',
        'shark',
        'sheep',
        'snake',
        'spider',
        'squirrel',
        'whale',
        'zebra',
      ]),
    },
    {
      label: 'Food & Drink',
      matches: createKeywordTester([
        'bacon',
        'barbecue',
        'beer',
        'bread',
        'brew',
        'cake',
        'cheese',
        'chef',
        'coffee',
        'cook',
        'cuisine',
        'diner',
        'drink',
        'grill',
        'kitchen',
        'meal',
        'pizza',
        'restaurant',
        'salad',
        'sauce',
        'snack',
        'spice',
        'steak',
        'tea',
        'toast',
        'wine',
      ]),
    },
    {
      label: 'Tech & Gadgets',
      matches: createKeywordTester([
        'algorithm',
        'app',
        'binary',
        'cloud',
        'code',
        'computer',
        'cpu',
        'data',
        'digital',
        'download',
        'gamer',
        'internet',
        'keyboard',
        'laptop',
        'phone',
        'robot',
        'server',
        'software',
        'tech',
        'virtual',
        'wifi',
      ]),
    },
    {
      label: 'Science & Space',
      matches: createKeywordTester([
        'asteroid',
        'atom',
        'biology',
        'chemist',
        'dna',
        'experiment',
        'galaxy',
        'gravity',
        'lab',
        'molecule',
        'orbit',
        'physics',
        'planet',
        'rocket',
        'science',
        'space',
        'star',
        'telescope',
      ]),
    },
    {
      label: 'Work & Careers',
      matches: createKeywordTester([
        'boss',
        'career',
        'coworker',
        'desk',
        'email',
        'employee',
        'interview',
        'meeting',
        'office',
        'profession',
        'resume',
        'salary',
        'startup',
        'work',
      ]),
    },
    {
      label: 'School & Learning',
      matches: createKeywordTester([
        'algebra',
        'assignment',
        'class',
        'college',
        'exam',
        'homework',
        'lesson',
        'math',
        'professor',
        'school',
        'student',
        'study',
        'teacher',
        'textbook',
        'university',
      ]),
    },
    {
      label: 'Sports & Games',
      matches: createKeywordTester([
        'athlete',
        'baseball',
        'basketball',
        'coach',
        'football',
        'golf',
        'hockey',
        'olympic',
        'race',
        'referee',
        'score',
        'soccer',
        'sport',
        'stadium',
        'team',
        'tennis',
        'tournament',
        'umpire',
      ]),
    },
    {
      label: 'Music & Arts',
      matches: createKeywordTester([
        'art',
        'artist',
        'band',
        'canvas',
        'choir',
        'concert',
        'dance',
        'gallery',
        'guitar',
        'museum',
        'music',
        'note',
        'opera',
        'paint',
        'piano',
        'song',
        'stage',
        'studio',
        'theater',
        'violin',
      ]),
    },
    {
      label: 'Travel & Places',
      matches: createKeywordTester([
        'airport',
        'beach',
        'bridge',
        'cabin',
        'city',
        'hotel',
        'island',
        'journey',
        'map',
        'mountain',
        'plane',
        'road',
        'tour',
        'train',
        'travel',
        'vacation',
      ]),
    },
    {
      label: 'Money & Finance',
      matches: createKeywordTester([
        'bank',
        'budget',
        'cash',
        'coin',
        'credit',
        'debt',
        'dollar',
        'economy',
        'expense',
        'finance',
        'interest',
        'investment',
        'loan',
        'money',
        'tax',
        'wallet',
      ]),
    },
    {
      label: 'Health & Wellness',
      matches: createKeywordTester([
        'doctor',
        'exercise',
        'gym',
        'health',
        'hospital',
        'nurse',
        'patient',
        'pharmacy',
        'pill',
        'sleep',
        'surgery',
        'wellness',
        'yoga',
      ]),
    },
    {
      label: 'Home & DIY',
      matches: createKeywordTester([
        'appliance',
        'basement',
        'bathroom',
        'broom',
        'carpet',
        'ceiling',
        'furniture',
        'garage',
        'garden',
        'hammer',
        'house',
        'kitchen',
        'ladder',
        'lawn',
        'paint',
        'plumber',
        'repair',
        'roof',
        'tool',
      ]),
    },
    {
      label: 'Family & Relationships',
      matches: createKeywordTester([
        'baby',
        'bride',
        'child',
        'dad',
        'daughter',
        'family',
        'father',
        'grandma',
        'grandpa',
        'husband',
        'kid',
        'marriage',
        'mom',
        'mother',
        'parent',
        'son',
        'wife',
      ]),
    },
    {
      label: 'Seasonal & Weather',
      matches: createKeywordTester([
        'autumn',
        'christmas',
        'cold',
        'fall',
        'holiday',
        'pumpkin',
        'season',
        'snow',
        'spring',
        'summer',
        'sunny',
        'weather',
        'winter',
      ]),
    },
    {
      label: 'Numbers & Math',
      matches: (text) => /\b(calculus|count|equation|geometry|math|measure|number|percent|pi|ratio|statistics?)\b/.test(text),
    },
    {
      label: 'Wordplay & Language',
      matches: createKeywordTester([
        'alphabet',
        'dictionary',
        'grammar',
        'language',
        'letter',
        'pun',
        'rhyme',
        'sentence',
        'spell',
        'word',
      ]),
    },
    {
      label: 'Bathroom Humor',
      matches: createKeywordTester([
        'bathroom',
        'flush',
        'poop',
        'potty',
        'toilet',
      ]),
    },
    {
      label: 'Cheeky Mischief',
      matches: (text) => /\b(cheek|flirt|kiss|lingerie|naked|romance|sassy|saucy|sly|snowball|spicy|wink)\b/.test(text) || text.includes('balls'),
    },
  ];

  function categorizeJoke(setup, punchline) {
    const source = `${setup || ''} ${punchline || ''}`.toLowerCase();
    const collected = [];

    rules.forEach((rule) => {
      try {
        if (rule.matches(source)) {
          collected.push(rule.label);
        }
      } catch (error) {
        // Ignore matcher errors to keep categorization resilient.
      }
    });

    const unique = collected.filter((label, index) => collected.indexOf(label) === index);

    if (!unique.length) {
      unique.push(fallbackCategory);
    }

    return unique.slice(0, 3);
  }

  if (!window.jokeCategoryHelper) {
    window.jokeCategoryHelper = {};
  }

  window.jokeCategoryHelper.categorize = categorizeJoke;
  window.jokeCategoryHelper.fallback = fallbackCategory;
})();
