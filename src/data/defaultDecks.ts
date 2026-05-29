/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Deck } from '../types';

export const DEFAULT_DECKS: Deck[] = [
  {
    id: 'hsk1-core',
    name: 'HSK 1 Beginner Essentials',
    description: 'Get started with the absolute core basics of Mandarin. Learn greetings, fundamental pronouns, and everyday vocabulary.',
    category: 'hsk1',
    isCustom: false,
    createdBy: 'Official Editor',
    createdTime: 1716912000000,
    language: 'Chinese',
    cards: [
      {
        id: 'hsk1-nihao',
        character: '你好',
        pinyin: 'nǐ hǎo',
        english: 'Hello',
        example: '你好！很高兴认识你。',
        examplePinyin: 'Nǐ hǎo! Hěn gāoxìng rènshi nǐ.',
        exampleEnglish: 'Hello! Nice to meet you.',
        audioHint: '\"Nee-how\". Low dipping tone on both, but first sounds like rising (3rd-to-2nd tone sandhi).'
      },
      {
        id: 'hsk1-xiexie',
        character: '谢谢',
        pinyin: 'xièxie',
        english: 'Thank you',
        example: '谢谢你的帮助。',
        examplePinyin: 'Xièxie nǐ de bāngzhù.',
        exampleEnglish: 'Thank you for your help.',
        audioHint: '\"Shyeh-shyeh\". First syllable starts high and drops sharply (4th tone), second is light/neutral.'
      },
      {
        id: 'hsk1-zaijian',
        character: '再见',
        pinyin: 'zài jiàn',
        english: 'Goodbye',
        example: '爸爸，再见！',
        examplePinyin: 'Bàba, zàijiàn!',
        exampleEnglish: 'Goodbye, dad!',
        audioHint: '\"Dzai-jyen\". Both syllables drop sharply (two 4th tones).'
      },
      {
        id: 'hsk1-wo',
        character: '我',
        pinyin: 'wǒ',
        english: 'I, me',
        example: '我是一个学生。',
        examplePinyin: 'Wǒ shì yí gè xuésheng.',
        exampleEnglish: 'I am a student.',
        audioHint: '\"Waw\". Low dipping tone (3rd tone).'
      },
      {
        id: 'hsk1-ni',
        character: '你',
        pinyin: 'nǐ',
        english: 'You',
        example: '你喜欢喝茶吗？',
        examplePinyin: 'Nǐ xǐhuan hē chá ma?',
        exampleEnglish: 'Do you like to drink tea?',
        audioHint: '\"Nee\". Low dipping tone (3rd tone).'
      },
      {
        id: 'hsk1-shi',
        character: '是',
        pinyin: 'shì',
        english: 'To be (am, is, are, yes)',
        example: '他是我的老师。',
        examplePinyin: 'Tā shì wǒ de lǎoshī.',
        exampleEnglish: 'He is my teacher.',
        audioHint: '\"Shurr\". Sharp descending tone (4th tone). Curl tongue slightly back.'
      },
      {
        id: 'hsk1-xuexi',
        character: '学习',
        pinyin: 'xué xí',
        english: 'To study, learn',
        example: '我们在学习汉语。',
        examplePinyin: 'Wǒmen zài xuéxí Hànyǔ.',
        exampleEnglish: 'We are studying Chinese.',
        audioHint: '\"Shu-eh hsee\". Both syllables rise like asking a question (two 2nd tones).'
      },
      {
        id: 'hsk1-shui',
        character: '水',
        pinyin: 'shuǐ',
        english: 'Water',
        example: '我想喝一点水。',
        examplePinyin: 'Wǒ xiǎng hē yìdiǎn shuǐ.',
        exampleEnglish: 'I want to drink some water.',
        audioHint: '\"Shway\". Low dipping tone (3rd tone). Tongue curled slightly.'
      },
      {
        id: 'hsk1-xihuan',
        character: '喜欢',
        pinyin: 'xǐ huan',
        english: 'To like',
        example: '你喜欢中国菜吗？',
        examplePinyin: 'Nǐ xǐhuan Zhōngguó cài ma?',
        exampleEnglish: 'Do you like Chinese food?',
        audioHint: '\"Shee-hwan\". First syllable dips low (3rd tone), second is light and short.'
      },
      {
        id: 'hsk1-pingguo',
        character: '苹果',
        pinyin: 'píng guǒ',
        english: 'Apple',
        example: '这个红苹果很好吃。',
        examplePinyin: 'Zhège hóng píngguǒ hěn hǎochī.',
        exampleEnglish: 'This red apple is delicious.',
        audioHint: '\"Peeng-gwaw\". First syllable rises (2nd tone), second dips low (3rd tone).'
      }
    ]
  },
  {
    id: 'food-dining',
    name: 'Food & Restaurant Chinese',
    description: 'Learn vocabulary and phrases necessary to survive in a restaurant, understand dishes, and order like a pro.',
    category: 'conversational',
    isCustom: false,
    createdBy: 'Official Culinary',
    createdTime: 1716913000000,
    language: 'Chinese',
    cards: [
      {
        id: 'food-mifan',
        character: '米饭',
        pinyin: 'mǐ fàn',
        english: 'Cooked rice',
        example: '服务员，请给我一碗米饭。',
        examplePinyin: 'Fúwùyuán, qǐng gěi wǒ yì wǎn mǐfàn.',
        exampleEnglish: 'Waiter, please give me a bowl of cooked rice.',
        audioHint: '\"Mee-fahn\". First dips (3rd), second drops sharply (4th).'
      },
      {
        id: 'food-miantiao',
        character: '面条',
        pinyin: 'miàn tiáo',
        english: 'Noodles',
        example: '我喜欢吃牛肉面条。',
        examplePinyin: 'Wǒ xǐhuan chī niúròu miàntiáo.',
        exampleEnglish: 'I like eating beef noodles.',
        audioHint: '\"Myen-tyow\". First drops sharply (4th), second rises smoothly (2nd).'
      },
      {
        id: 'food-jiaozi',
        character: '饺子',
        pinyin: 'jiǎo zi',
        english: 'Dumplings',
        example: '过年的时候我们要吃饺子。',
        examplePinyin: 'Guònián de shíhou wǒmen yào chī jiǎozi.',
        exampleEnglish: 'We eat dumplings during the Lunar New Year.',
        audioHint: '\"Jyow-dzuh\". First dips low (3rd), second is neutral/light.'
      },
      {
        id: 'food-cha',
        character: '茶',
        pinyin: 'chá',
        english: 'Tea',
        example: '请喝杯绿茶吧。',
        examplePinyin: 'Qǐng hē bēi lǜchá ba.',
        exampleEnglish: 'Please have a cup of green tea.',
        audioHint: '\"Chah\". Rises smoothly like a question (2nd tone).'
      },
      {
        id: 'food-haochi',
        character: '好吃',
        pinyin: 'hǎo chī',
        english: 'Delicious (good to eat)',
        example: '妈妈做的饺子真好吃！',
        examplePinyin: 'Māma zuò de jiǎozi zhēn hǎochī!',
        exampleEnglish: 'The dumplings made by mom are truly delicious!',
        audioHint: '\"How-churr\". First dips low (3rd), second is flat and high (1st tone).'
      },
      {
        id: 'food-maidan',
        character: '买单',
        pinyin: 'mǎi dān',
        english: 'To pay the bill / check, please',
        example: '服务员，我们要买单。',
        examplePinyin: 'Fúwùyuán, wǒmen yào mǎidān.',
        exampleEnglish: 'Waiter, we would like to pay.',
        audioHint: '\"My-dahn\". First dips (3rd), second is flat and high (1st).'
      },
      {
        id: 'food-la',
        character: '辣',
        pinyin: 'là',
        english: 'Spicy',
        example: '这个菜太辣了，我需要喝水。',
        examplePinyin: 'Zhège cài tài là le, wǒ xūyào hē shuǐ.',
        exampleEnglish: 'This dish is too spicy, I need to drink water.',
        audioHint: '\"Lah\". Sharp downward punch (4th tone).'
      }
    ]
  },
  {
    id: 'travel-essential',
    name: 'Polite Travel Survival',
    description: 'Crucial nav, directional, and financial vocabulary to help you explore and talk to locals smoothly during travels.',
    category: 'travel',
    isCustom: false,
    createdBy: 'Official Travel',
    createdTime: 1716914000000,
    language: 'Chinese',
    cards: [
      {
        id: 'trav-duoshaoqian',
        character: '多少钱',
        pinyin: 'duō shao qián',
        english: 'How much does it cost?',
        example: '老板，请问这个苹果多少钱？',
        examplePinyin: 'Lǎobān, qǐngwèn zhège píngguǒ duōshao qián?',
        exampleEnglish: 'Boss, may I ask how much this apple is?',
        audioHint: '\"Dwaw-shao chyen\". Flat starts (1st), short/neutral, then rising (2nd).'
      },
      {
        id: 'trav-weishengjian',
        character: '卫生间',
        pinyin: 'wèi shēng jiān',
        english: 'Restroom, toilet',
        example: '请问，卫生间在哪里？',
        examplePinyin: 'Qǐngwèn, wèishēngjiān zài nǎlǐ?',
        exampleEnglish: 'Excuse me, where is the restroom?',
        audioHint: '\"Way-shung-jyen\". Drops sharply (4th), then high flat (1st), and high flat (1st).'
      },
      {
        id: 'trav-bangwo',
        character: '帮我',
        pinyin: 'bāng wǒ',
        english: 'Help me',
        example: '你能帮我找我的酒店吗？',
        examplePinyin: 'Nǐ néng bāng wǒ zhǎo wǒ de jiǔdiàn ma?',
        exampleEnglish: 'Can you help me find my hotel?',
        audioHint: '\"Bahng-waw\". Flat high tone (1st), followed by low dipping tone (3rd).'
      },
      {
        id: 'trav-jichang',
        character: '机场',
        pinyin: 'jī chǎng',
        english: 'Airport (machine field)',
        example: '出租车，去北京首都机场。',
        examplePinyin: 'Chūzhūchē, qù Běijīng shǒudū jīchǎng.',
        exampleEnglish: 'Taxi, go to Beijing Capital Airport.',
        audioHint: '\"Jee-chahng\". Flat high (1st), then low dipping (3rd) with rolling tongue.'
      },
      {
        id: 'trav-jiudian',
        character: '酒店',
        pinyin: 'jiǔ diàn',
        english: 'Hotel (wine shop)',
        example: '我们今晚住在这家酒店。',
        examplePinyin: 'Wǒmen jīnwǎn zhù zài zhè jiā jiǔdiàn.',
        exampleEnglish: 'We are staying at this hotel tonight.',
        audioHint: '\"Jyoo-dyen\". Low dipping tone (3rd), followed by a sharp drop (4th).'
      }
    ]
  },
  {
    id: 'spanish-basics',
    name: 'Spanish Travel Essentials',
    description: 'Learn simple greetings, polite survival words, and ordering foods in Spanish.',
    category: 'travel',
    isCustom: false,
    createdBy: 'Official Spanish Editor',
    createdTime: 1716915000000,
    language: 'Spanish',
    cards: [
      {
        id: 'es-hola',
        character: 'Hola',
        pinyin: '[oh-lah]',
        english: 'Hello / Hi',
        example: '¡Hola! ¿Cómo estás?',
        examplePinyin: '[oh-lah co-moh es-tahs]',
        exampleEnglish: 'Hello! How are you?',
        audioHint: 'The H is silent in Spanish.'
      },
      {
        id: 'es-gracias',
        character: 'Gracias',
        pinyin: '[grah-syahs]',
        english: 'Thank you',
        example: 'Muchas gracias por la comida.',
        examplePinyin: '[moo-chahs grah-syahs por lah co-mee-dah]',
        exampleEnglish: 'Thank you very much for the food.',
        audioHint: 'Pronounce the C like s (Latin America) or th (Spain).'
      },
      {
        id: 'es-por-favor',
        character: 'Por favor',
        pinyin: '[por fah-vor]',
        english: 'Please',
        example: 'La cuenta, por favor.',
        examplePinyin: '[lah kwen-tah por fah-vor]',
        exampleEnglish: 'The bill, please.',
        audioHint: 'Soft Spanish R at the end.'
      },
      {
        id: 'es-bano',
        character: 'El baño',
        pinyin: '[el bah-nyoh]',
        english: 'The bathroom / toilet',
        example: '¿Dónde está el baño?',
        examplePinyin: '[dohn-deh es-tah el bah-nyoh]',
        exampleEnglish: 'Where is the bathroom?',
        audioHint: 'The ñ makes a ny sound, like onion.'
      },
      {
        id: 'es-agua',
        character: 'Agua',
        pinyin: '[ah-gwah]',
        english: 'Water',
        example: 'Un vaso de agua, por favor.',
        examplePinyin: '[oon bah-so deh ah-gwah por fah-vor]',
        exampleEnglish: 'A glass of water, please.',
        audioHint: 'Keep vowels short and crisp.'
      }
    ]
  },
  {
    id: 'french-basics',
    name: 'French Cafe & Chit-Chat',
    description: 'Essential polite conversations, ordering croissants, and surviving in a Parisian cafe.',
    category: 'conversational',
    isCustom: false,
    createdBy: 'Official French Editor',
    createdTime: 1716916000000,
    language: 'French',
    cards: [
      {
        id: 'fr-bonjour',
        character: 'Bonjour',
        pinyin: '[bohn-zhoor]',
        english: 'Hello / Good morning',
        example: 'Bonjour, comment ça va ?',
        examplePinyin: '[bohn-zhoor co-mahn sah vah]',
        exampleEnglish: 'Hello, how is it going?',
        audioHint: 'Nasal O in "bon" and a soft throat R at the end.'
      },
      {
        id: 'fr-merci',
        character: 'Merci',
        pinyin: '[mair-see]',
        english: 'Thank you',
        example: 'Merci beaucoup !',
        examplePinyin: '[mair-see boh-coo]',
        exampleEnglish: 'Thank you very much!',
        audioHint: 'Throaty French R sound.'
      },
      {
        id: 'fr-sil-vous-plait',
        character: 'S\'il vous plaît',
        pinyin: '[seel voo pleh]',
        english: 'Please (formal)',
        example: 'Un café, s\'il vous plaît.',
        examplePinyin: '[oon cah-feh seel voo pleh]',
        exampleEnglish: 'A coffee, please.',
        audioHint: 'Do not pronounce the t at the end of plaît.'
      },
      {
        id: 'fr-croissant',
        character: 'Croissant',
        pinyin: '[crwah-sahn]',
        english: 'Croissant',
        example: 'Je voudrais un croissant.',
        examplePinyin: '[zhuh voo-dreh oon crwah-sahn]',
        exampleEnglish: 'I would like a croissant.',
        audioHint: 'Nasal trailing sound, do not sound the t!'
      }
    ]
  }
];
