import heroKhartoumImg from '../assets/images/hero_khartoum_market_1794596899241.jpg';
import villaImg from '../assets/images/listing_real_estate_khartoum_1794596899925.jpg';
import hiluxImg from '../assets/images/listing_car_hilux_1794596899786.jpg';
import solarImg from '../assets/images/listing_solar_energy_1794596899250.jpg';
import laptopImg from '../assets/images/listing_electronics_laptop_1794596900906.jpg';
import { Category, SudanState } from '../types/marketplace';

export const HERO_IMAGE_PATH = heroKhartoumImg;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'real_estate', nameAr: 'عقارات وأراضي', slug: 'real-estate', icon: 'Building2', order: 1, isActive: true },
  { id: 'vehicles', nameAr: 'سيارات ومركبات', slug: 'vehicles', icon: 'Car', order: 2, isActive: true },
  { id: 'electronics', nameAr: 'إلكترونيات وهواتف', slug: 'electronics', icon: 'Smartphone', order: 3, isActive: true },
  { id: 'solar_energy', nameAr: 'طاقة شمسية وكهرباء', slug: 'solar-energy', icon: 'Sun', order: 4, isActive: true },
  { id: 'furniture', nameAr: 'أثاث ومستلزمات منزل', slug: 'furniture', icon: 'Sofa', order: 5, isActive: true },
  { id: 'agriculture', nameAr: 'زراعة وثروة حيوانية', slug: 'agriculture', icon: 'Sprout', order: 6, isActive: true },
  { id: 'jobs_services', nameAr: 'خدمات ووظائف', slug: 'jobs-services', icon: 'Briefcase', order: 7, isActive: true },
  { id: 'commerce', nameAr: 'تجارة عامة وأزياء', slug: 'commerce', icon: 'ShoppingBag', order: 8, isActive: true },
];

export const DEFAULT_STATES: SudanState[] = [
  { id: 'khartoum', nameAr: 'الخرطوم', cities: ['الخرطوم', 'أم درمان', 'بحري', 'شرق النيل', 'جبل أولياء'], order: 1, isActive: true },
  { id: 'gezira', nameAr: 'الجزيرة', cities: ['ود مدني', 'المناقل', 'الحصاحيصا', 'الكاملين', 'رفاعة'], order: 2, isActive: true },
  { id: 'red_sea', nameAr: 'البحر الأحمر', cities: ['بورتسودان', 'سواكن', 'طوكر', 'سنكات'], order: 3, isActive: true },
  { id: 'river_nile', nameAr: 'نهر النيل', cities: ['عطبرة', 'الدامر', 'شندي', 'بربر', 'أبو حمد'], order: 4, isActive: true },
  { id: 'northern', nameAr: 'الشمالية', cities: ['دنقلا', 'مروي', 'كريمة', 'الدبة', 'وادي حلفا'], order: 5, isActive: true },
  { id: 'kassala', nameAr: 'كسلا', cities: ['كسلا', 'حلفا الجديدة', 'خشم القربة', 'أروما'], order: 6, isActive: true },
  { id: 'gedaref', nameAr: 'القضارف', cities: ['القضارف', 'الفاو', 'قلع النحل', 'الحواتة'], order: 7, isActive: true },
  { id: 'sennar', nameAr: 'سنار', cities: ['سنجة', 'سنار', 'الدندر', 'السوكي'], order: 8, isActive: true },
  { id: 'white_nile', nameAr: 'النيل الأبيض', cities: ['ربك', 'كوستي', 'الدويم', 'الجبلين', 'تندلتي'], order: 9, isActive: true },
  { id: 'blue_nile', nameAr: 'النيل الأزرق', cities: ['الدمازين', 'الروصيرص', 'باو', 'الكرمك'], order: 10, isActive: true },
  { id: 'north_kordofan', nameAr: 'شمال كردفان', cities: ['الأبيض', 'أم روابة', 'الرهد', 'بارا'], order: 11, isActive: true },
  { id: 'south_kordofan', nameAr: 'جنوب كردفان', cities: ['كادوقلي', 'الدلنج', 'أبو جبيهة', 'العباسية'], order: 12, isActive: true },
  { id: 'west_kordofan', nameAr: 'غرب كردفان', cities: ['الفولة', 'النهود', 'بابنوسة', 'المجلد'], order: 13, isActive: true },
  { id: 'north_darfur', nameAr: 'شمال دارفور', cities: ['الفاشر', 'كتم', 'مليط', 'كبكابية'], order: 14, isActive: true },
  { id: 'south_darfur', nameAr: 'جنوب دارفور', cities: ['نيالا', 'عد الفرسان', 'برام', 'رهيد البردي'], order: 15, isActive: true },
  { id: 'west_darfur', nameAr: 'غرب دارفور', cities: ['الجنينة', 'فور برنقا', 'كرينك'], order: 16, isActive: true },
  { id: 'central_darfur', nameAr: 'وسط دارفور', cities: ['زالنجي', 'نيرتتي', 'روكرو'], order: 17, isActive: true },
  { id: 'east_darfur', nameAr: 'شرق دارفور', cities: ['الضعين', 'بحر العرب', 'عديلة'], order: 18, isActive: true },
];

export const INITIAL_SAMPLE_LISTINGS = [
  {
    id: 'seed_villa_khartoum_01',
    title: 'فيلا حديثة بتصميم معماري مميز في حي الرياض بالخرطوم',
    description:
      'فيلا سكنية فاخرة مكونة من طابقين مع حوش واسع وحديقة نخيل، تشطيب سوبر ديلوكس، 5 غرف نوم ماستر، صالونين، مطبخ مجهز بالكامل، ومنظومة طاقة شمسية احتياطية متكاملة. موقع هادئ وقريب من الخدمات الرئيسية.',
    price: 280000,
    currency: 'USD' as const,
    negotiable: true,
    categoryId: 'real_estate',
    categoryName: 'عقارات وأراضي',
    stateId: 'khartoum',
    stateName: 'الخرطوم',
    city: 'الخرطوم',
    condition: 'new' as const,
    contactPhone: '+249912345678',
    contactWhatsapp: '249912345678',
    images: [villaImg],
    status: 'active' as const,
    isFeatured: true,
  },
  {
    id: 'seed_hilux_portsudan_02',
    title: 'تويوتا هايلكس دبل كابينة 4x4 موديل حديث بحالة الوكالة',
    description:
      'سيارة تويوتا هايلكس دفع رباعي دبل كابينة، محرك ديزل اقتصادي وقوي، صيانة دورية منتظمة، تكييف ممتاز، إطارات جديدة، خالية من الحوادث والرش، ترخيص ساري وجاهزة للاستخدام الفوري.',
    price: 42500,
    currency: 'USD' as const,
    negotiable: true,
    categoryId: 'vehicles',
    categoryName: 'سيارات ومركبات',
    stateId: 'red_sea',
    stateName: 'البحر الأحمر',
    city: 'بورتسودان',
    condition: 'used' as const,
    contactPhone: '+249912300112',
    contactWhatsapp: '249912300112',
    images: [hiluxImg],
    status: 'active' as const,
    isFeatured: true,
  },
  {
    id: 'seed_solar_atbara_03',
    title: 'منظومة طاقة شمسية متكاملة 5 كيلوواط مع بطارية ليثيوم',
    description:
      'منظومة طاقة شمسية منزلية عالية الكفاءة تشمل 8 ألواح مونو كريستالين 550 واط + إنفرتر هايبرد 5 كيلوواط + بطارية ليثيوم ذكية بعمر افتراضي طويل. تشمل التركيب والضمان في عطبرة والدامر وشندي.',
    price: 4850000,
    currency: 'SDG' as const,
    negotiable: false,
    categoryId: 'solar_energy',
    categoryName: 'طاقة شمسية وكهرباء',
    stateId: 'river_nile',
    stateName: 'نهر النيل',
    city: 'عطبرة',
    condition: 'new' as const,
    contactPhone: '+249922887766',
    contactWhatsapp: '249922887766',
    images: [solarImg],
    status: 'active' as const,
    isFeatured: true,
  },
  {
    id: 'seed_laptop_madani_04',
    title: 'لابتوب أعمال فائق النحافة مع هاتف ذكي بحالة ممتازة',
    description:
      'جهاز لابتوب بمعالج حديث، ذاكرة 16 جيجابايت وقرص SSD سعة 512 جيجابايت، شاشة عالية الدقة وبطارية تدوم طوال اليوم. مناسب للمهندسين والطلاب وأصحاب الأعمال الحرة. المعاينة متاحة.',
    price: 1650000,
    currency: 'SDG' as const,
    negotiable: true,
    categoryId: 'electronics',
    categoryName: 'إلكترونيات وهواتف',
    stateId: 'gezira',
    stateName: 'الجزيرة',
    city: 'ود مدني',
    condition: 'used' as const,
    contactPhone: '+249918445566',
    contactWhatsapp: '249918445566',
    images: [laptopImg],
    status: 'active' as const,
    isFeatured: false,
  },
];
