const fs = require('fs');
const path = require('path');

const companies = [
  {
    id: '66f000000000000000000010',
    name: 'UltraTech Cement',
    code: 'UTC',
    industry: 'Cement & Building Materials (Designated Consumer)',
    headquarters: 'Ahura Centre, Andheri (East), Mumbai, Maharashtra - 400093',
    contactPerson: {
      name: 'K. C. Jhanwar',
      email: 'kc.jhanwar@ultratechcement.com',
      phone: '+91 22 6691 7800',
    },
    units: [
      { id: 'UTC_KOTPUTLI', name: 'Kotputli Cement Works (Ultratech Cement)', loc: 'Kotputli, Rajasthan', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_ADITYA', name: 'Aditya Cement Works (Ultratech Cement)', loc: 'Shambhupura, Chittorgarh, Rajasthan', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_JHARSUGDA', name: 'Jharsugda Cement Works (Ultratech Cement)', loc: 'Jharsuguda, Odisha', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_PALI', name: 'Pali Cement Works (Ultratech Cement)', loc: 'Pali, Rajasthan', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_ROORKEE', name: 'Roorkee Cement Works (Ultratech Cement)', loc: 'Roorkee, Haridwar, Uttarakhand', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_VIKRAM', name: 'Vikram Cement Works (Ultratech Cement)', loc: 'Khor, Neemuch, Madhya Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_BELA', name: 'Bela Cement Works (Ultratech Cement)', loc: 'Bela, Rewa, Madhya Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_SIDHI', name: 'Sidhi Cement Works (Ultratech Cement)', loc: 'Sidhi, Madhya Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_MAHIHAR', name: 'Mahihar Cement Works (Ultratech Cement)', loc: 'Maihar, Satna, Madhya Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_NATHDWARA', name: 'Nathdwara Cement Works (Ultratech Cement)', loc: 'Sirohi, Rajasthan', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_CUTTACK', name: 'Cuttack Cement Works (Ultratech Cement)', loc: 'Cuttack, Odisha', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_INDIA_CEMENTS', name: 'India Cements Limited', loc: 'Sankarnagar, Tirunelveli, Tamil Nadu', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_DADRI', name: 'Dadri Cements Limited', loc: 'Dadri, Gautam Buddha Nagar, Uttar Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_SIKANDERABAD', name: 'Sikanderabad Cement Limited', loc: 'Sikandrabad, Bulandshahr, Uttar Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_NARMADA', name: 'Narmada Cement Works', loc: 'Jafrabad, Amreli, Gujarat', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_ALIGARH', name: 'Aligarh Cement Works', loc: 'Aligarh, Uttar Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_TANDA', name: 'Tanda Cement Works', loc: 'Ambedkar Nagar, Uttar Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_PANIPAT', name: 'Panipat Cement Works', loc: 'Panipat, Haryana', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_PARLI', name: 'Parli Cement Works', loc: 'Parli Vaijnath, Beed, Maharashtra', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_MADDALA', name: 'Maddala Cement Works', loc: 'Maddala, Guntur, Andhra Pradesh', cat: 'Designated Consumer (DC) - Cement' },
      { id: 'UTC_ARAKKONAM', name: 'Arakkonam Cement Works', loc: 'Arakkonam, Ranipet, Tamil Nadu', cat: 'Designated Consumer (DC) - Cement' },
    ],
  },
  {
    id: '66f000000000000000000001',
    name: 'Trident Group',
    code: 'TRIDENT',
    industry: 'Pulp & Paper, Textiles, Chemicals & Captive Power',
    headquarters: 'Ludhiana, Punjab, India',
    contactPerson: {
      name: 'Vikram Singh',
      email: 'vikram.singh@tridentindia.com',
      phone: '+91 98765 43210',
    },
    units: [
      { id: 'TRIDENT_PAPER', name: 'Trident Group - Paper Division', loc: 'Dhaula, Barnala, Punjab - 148107', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'TRIDENT_YARN', name: 'Trident Group - Yarn', loc: 'Budhni, Sehore, Madhya Pradesh - 466445', cat: 'Designated Consumer (DC) - Textile Spinning' },
      { id: 'TRIDENT_TEXTILES', name: 'Trident Group - Home Textile', loc: 'Barnala, Punjab - 148101', cat: 'Commercial Industrial Unit - Home Textiles' },
    ],
  },
  {
    id: '66f000000000000000000020',
    name: 'Chiripal Group',
    code: 'CHIRIPAL',
    industry: 'Textiles, Denim, Polyfilms & Petrochemicals',
    headquarters: 'Shivranjani Cross Roads, Satellite, Ahmedabad, Gujarat - 380015',
    contactPerson: {
      name: 'Vishal Chiripal',
      email: 'vishal@chiripalgroup.com',
      phone: '+91 79 2673 4660',
    },
    units: [
      { id: 'CHIRIPAL_NANDAN_VRAJ', name: 'Nandan Denim Limited - Vraj', loc: 'Vraj Integrated Textile Park, Bidaj, Gujarat', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'CHIRIPAL_NANDAN_PIPLAJ', name: 'Nandan Denim Limited - Piplaj', loc: 'Piplaj, Ahmedabad, Gujarat', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'CHIRIPAL_NANDAN_TERRY', name: 'Nandan Terry Towel', loc: 'Dholka, Ahmedabad, Gujarat', cat: 'Commercial Industrial Unit - Terry Towels' },
      { id: 'CHIRIPAL_FABRIC_DIV', name: 'Chirpal Industries - Fabric Divison', loc: 'Ranipur, Ahmedabad, Gujarat', cat: 'Commercial Industrial Unit - Fabrics' },
      { id: 'CHIRIPAL_QUALITY_EXIM', name: 'Quality Exim', loc: 'Surat, Gujarat', cat: 'Commercial Industrial Unit - Synthetic Textiles' },
      { id: 'CHIRIPAL_VISHAL_FAB', name: 'Vishal Fabrics', loc: 'Dholka, Gujarat', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'CHIRIPAL_COTTON_MILL', name: 'Chiripal Textile Cotton Mill', loc: 'Bareja, Ahmedabad, Gujarat', cat: 'Commercial Industrial Unit - Cotton Spinning' },
      { id: 'CHIRIPAL_POLYFILMS', name: 'Chirpal Polyfilms Limited', loc: 'Vapi, Valsad, Gujarat', cat: 'Designated Consumer (DC) - Petrochemical Films' },
    ],
  },
  {
    id: '66f000000000000000000030',
    name: 'Hero MotoCorp',
    code: 'HERO',
    industry: 'Automobile & Two-Wheeler Manufacturing (PAT DC)',
    headquarters: 'The Grand Plaza, Nelson Mandela Road, Vasant Kunj, New Delhi - 110070',
    contactPerson: {
      name: 'Sunil Kant Munjal',
      email: 'compliance@heromotocorp.com',
      phone: '+91 11 4604 4100',
    },
    units: [
      { id: 'HERO_DHARUHERA', name: 'Hero MotoCorp - Dharuhera', loc: 'Dharuhera Industrial Estate, Rewari, Haryana', cat: 'Designated Consumer (DC) - Automobile' },
      { id: 'HERO_GURGAON', name: 'Hero MotoCorp - Gurgaoon', loc: 'Sector 33, Gurugram, Haryana', cat: 'Designated Consumer (DC) - Automobile' },
      { id: 'HERO_HARIDWAR', name: 'Hero MotoCorp - Haridwar', loc: 'IIE SIDCUL, Haridwar, Uttarakhand', cat: 'Designated Consumer (DC) - Automobile' },
      { id: 'HERO_RAJASTHAN', name: 'Hero MotoCorp - Rajasthan', loc: 'RIICO Industrial Area, Neemrana, Rajasthan', cat: 'Designated Consumer (DC) - Automobile' },
      { id: 'HERO_GUJARAT', name: 'Hero MotoCorp - Gujarat', loc: 'Halol Industrial Area, Panchmahal, Gujarat', cat: 'Designated Consumer (DC) - Automobile' },
    ],
  },
  {
    id: '66f000000000000000000040',
    name: 'Jindal Group',
    code: 'JINDAL',
    industry: 'Textiles, Denim, Spinning & Weaving (Designated Consumer)',
    headquarters: 'Jindal House, Shivranjani, Ahmedabad, Gujarat - 380015',
    contactPerson: {
      name: 'Amit Agrawal',
      email: 'compliance@jindaltextiles.com',
      phone: '+91 79 6608 5555',
    },
    units: [
      { id: 'JINDAL_CREATIONS', name: 'Jindal Creations', loc: 'Narol Industrial Area, Ahmedabad, Gujarat', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'JINDAL_WORLDWIDE', name: 'Jindal Worldwide', loc: 'Vatva GIDC, Ahmedabad, Gujarat', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'JINDAL_YASH_EXPORTS', name: 'Yash Exports', loc: 'Surat Textile Zone, Surat, Gujarat', cat: 'Commercial Industrial Unit - Textiles' },
      { id: 'JINDAL_YASH_WEAVERS', name: 'Yash Weavers', loc: 'Bapunagar Industrial Area, Ahmedabad, Gujarat', cat: 'Commercial Industrial Unit - Weaving' },
      { id: 'JINDAL_GAYATRI_WEAV', name: 'Gayatri Weavers', loc: 'Sachin GIDC, Surat, Gujarat', cat: 'Commercial Industrial Unit - Weaving' },
      { id: 'JINDAL_AMITARA_WEAV', name: 'Amitara Weavers', loc: 'Odhav Industrial Estate, Ahmedabad, Gujarat', cat: 'Commercial Industrial Unit - Weaving' },
      { id: 'JINDAL_BHAGYLAXMI', name: 'Bhagylaxmi Weavers', loc: 'Kadi Industrial Zone, Mehsana, Gujarat', cat: 'Commercial Industrial Unit - Weaving' },
      { id: 'JINDAL_PLANET_SPIN', name: 'Planet Spintex', loc: 'Sanand GIDC, Ahmedabad, Gujarat', cat: 'Designated Consumer (DC) - Spinning' },
      { id: 'JINDAL_BELAJ', name: 'Belaj', loc: 'Kadi, Mehsana, Gujarat', cat: 'Commercial Industrial Unit - Textiles' },
      { id: 'JINDAL_NIHARIKA', name: 'Niharika Deepshika', loc: 'Pandesara GIDC, Surat, Gujarat', cat: 'Commercial Industrial Unit - Textiles' },
    ],
  },
  {
    id: '66f000000000000000000050',
    name: 'Kajaria Ceramics',
    code: 'KAJARIA',
    industry: 'Ceramics, Vitrified Tiles & Sanitaryware',
    headquarters: 'Mohan Co-op Industrial Estate, Mathura Road, New Delhi - 110044',
    contactPerson: {
      name: 'Ashok Kajaria',
      email: 'info@kajariaceramics.com',
      phone: '+91 11 2694 6409',
    },
    units: [
      { id: 'KAJARIA_GAILPUR', name: 'Kajaria Ceramics - Gailpur', loc: 'Gailpur Industrial Area, Tijara, Alwar, Rajasthan', cat: 'Designated Consumer (DC) - Ceramics' },
      { id: 'KAJARIA_MALUTANA', name: 'Kajaria Ceramics - Malutana', loc: 'Malutana Industrial Estate, Alwar, Rajasthan', cat: 'Designated Consumer (DC) - Ceramics' },
      { id: 'KAJARIA_SIKANDERABAD', name: 'Kajaria Ceramics - Sikanderabad', loc: 'Sikandrabad Industrial Area, Bulandshahr, UP', cat: 'Designated Consumer (DC) - Ceramics' },
      { id: 'KAJARIA_SRIKALAHASTI', name: 'Kajaria Ceramics - Srikalahasti', loc: 'Srikalahasti, Tirupati District, Andhra Pradesh', cat: 'Designated Consumer (DC) - Ceramics' },
    ],
  },
  {
    id: '66f000000000000000000060',
    name: 'Wave Industries',
    code: 'WAVE',
    industry: 'Sugar Refining, Power Co-generation & Distilleries',
    headquarters: 'Wave One, Sector 18, Noida, Uttar Pradesh - 201301',
    contactPerson: {
      name: 'Rajiv Gupta',
      email: 'compliance@waveindustries.in',
      phone: '+91 120 418 0500',
    },
    units: [
      { id: 'WAVE_DHANAURA', name: 'Wave Industries (Sugar Mill - Dhanaura)', loc: 'Dhanaura, Amroha, Uttar Pradesh', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'WAVE_BIJNOR', name: 'Wave Industries (Sugar Mill - Bijnor)', loc: 'Bijnor, Uttar Pradesh', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'WAVE_BULANDSHAHR', name: 'Wave Industries (Sugar Mill - Bulandshahr)', loc: 'Bulandshahr, Uttar Pradesh', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'WAVE_AMROHA', name: 'Wave Industries (Sugar Mill - Amroha)', loc: 'Amroha, Uttar Pradesh', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'WAVE_SAHARANPUR', name: 'Wave Industries (Sugar Mill - Saharanpur)', loc: 'Saharanpur, Uttar Pradesh', cat: 'Designated Consumer (DC) - Sugar' },
    ],
  },
  {
    id: '66f000000000000000000070',
    name: 'Gayatrishakti Group',
    code: 'GAYATRI',
    industry: 'Paper & Board Manufacturing, Duplex Packaging',
    headquarters: 'GIDC Industrial Estate, Vapi, Valsad, Gujarat - 396195',
    contactPerson: {
      name: 'P. K. Agarwal',
      email: 'contact@gayatrishakti.com',
      phone: '+91 260 243 0567',
    },
    units: [
      { id: 'GAYATRI_KHERANI', name: 'Kherani Paper Limited', loc: 'Kherani, Vapi, Gujarat', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GAYATRI_UNIT1', name: 'Gayatrishakti Paper & Board Unit 1', loc: 'Phase II GIDC, Vapi, Gujarat', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GAYATRI_UNIT2', name: 'Gayatrishakti Paper & Board Unit 2', loc: 'Phase IV GIDC, Vapi, Gujarat', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GAYATRI_JAINCORD', name: 'Jaincord Industries Pvt Ltd', loc: 'Sachin GIDC, Surat, Gujarat', cat: 'Commercial Industrial Unit - Packaging' },
      { id: 'GAYATRI_MEHALI', name: 'Mehali Paper Pvt Ltd', loc: 'Dahej Industrial Estate, Bharuch, Gujarat', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GAYATRI_SAINSON', name: 'Sainson Paper Industries', loc: 'Bapoli, Kurukshetra, Haryana', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GAYATRI_NIKITA', name: 'Nikita Paper Limited', loc: 'Shamli, Uttar Pradesh', cat: 'Commercial Industrial Unit - Paper' },
      { id: 'GAYATRI_JANKI', name: 'Janki Newsprint Limited', loc: 'Bhopa Road, Muzaffarnagar, Uttar Pradesh', cat: 'Commercial Industrial Unit - Newsprint' },
    ],
  },
  {
    id: '66f000000000000000000080',
    name: 'Genus Group',
    code: 'GENUS',
    industry: 'Paper, Kraft & Duplex Board Manufacturing',
    headquarters: 'Moradabad Road, Bilaspur, Rampur / Moradabad, Uttar Pradesh',
    contactPerson: {
      name: 'I. C. Agarwal',
      email: 'info@genuspaper.com',
      phone: '+91 595 235 1500',
    },
    units: [
      { id: 'GENUS_MUZ', name: 'Genus Paper & Board - MUZ', loc: 'Muzaffarnagar, Uttar Pradesh', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GENUS_MBD', name: 'Genus Paper & Board - MBD', loc: 'Moradabad, Uttar Pradesh', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'GENUS_BINDLAS', name: 'Bindlas Duplux Limited', loc: 'Bhopa Road, Muzaffarnagar, Uttar Pradesh', cat: 'Commercial Industrial Unit - Duplex Board' },
      { id: 'GENUS_TEHRI', name: 'Tehri Paper Pvt Ltd', loc: 'Roorkee, Haridwar, Uttarakhand', cat: 'Commercial Industrial Unit - Kraft Paper' },
      { id: 'GENUS_AGARWAL', name: 'Agarwal Duplex Pvt Ltd', loc: 'Bhopa Road, Muzaffarnagar, Uttar Pradesh', cat: 'Commercial Industrial Unit - Duplex Board' },
    ],
  },
  {
    id: '66f000000000000000000090',
    name: 'Dev Priya',
    code: 'DEVPRIYA',
    industry: 'Kraft Paper & Duplex Board Manufacturing',
    headquarters: 'Mohkampur Industrial Area, Delhi Road, Meerut, Uttar Pradesh - 250002',
    contactPerson: {
      name: 'Sunil Kumar',
      email: 'info@devpriyapapers.com',
      phone: '+91 121 240 0511',
    },
    units: [
      { id: 'DEVPRIYA_PAPERS', name: 'Dev Priya Papers', loc: 'Mohkampur, Meerut, Uttar Pradesh', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'DEVPRIYA_INDUSTRIES', name: 'Dev Priya Industries', loc: 'Rithani, Meerut, Uttar Pradesh', cat: 'Commercial Industrial Unit - Kraft Paper' },
      { id: 'DEVPRIYA_PRODUCTS', name: 'Dev Priya Products', loc: 'Partapur Industrial Estate, Meerut, Uttar Pradesh', cat: 'Commercial Industrial Unit - Paper Products' },
    ],
  },
  {
    id: '66f000000000000000000100',
    name: 'RC Rungta',
    code: 'RCRUNGTA',
    industry: 'Iron, Steel & Sponge Iron (Designated Consumer)',
    headquarters: 'Rungta Complex, Main Road, Ramgarh Cantonment, Jharkhand - 829122',
    contactPerson: {
      name: 'Ram Chandra Rungta',
      email: 'contact@rcrungta.com',
      phone: '+91 6553 222 345',
    },
    units: [
      { id: 'RUNGTA_JHARKHAND_ISPAT', name: 'Jharkhand Ispat Limited', loc: 'Hesla, Ramgarh, Jharkhand', cat: 'Designated Consumer (DC) - Sponge Iron & Steel' },
      { id: 'RUNGTA_MAA_CHINAMASTIKA', name: 'Maa Chinamastika Limited', loc: 'Kuju, Ramgarh, Jharkhand', cat: 'Designated Consumer (DC) - Sponge Iron' },
      { id: 'RUNGTA_BHRAMPUTRA', name: 'Bhramputra Metalics', loc: 'Kamrup Industrial Area, Guwahati, Assam', cat: 'Commercial Industrial Unit - Steel Rolling' },
      { id: 'RUNGTA_CRACKERS', name: 'Crackers Alloy India Limited', loc: 'Bokaro Steel City, Jharkhand', cat: 'Commercial Industrial Unit - Alloys & Castings' },
    ],
  },
  {
    id: '66f000000000000000000110',
    name: 'N R Agarwal',
    code: 'NRAGARWAL',
    industry: 'Duplex Boards, Newsprint & Writing Paper',
    headquarters: '502 Fortune Terraces, New Link Road, Andheri (West), Mumbai - 400053',
    contactPerson: {
      name: 'R. N. Agarwal',
      email: 'admin@nragarwal.com',
      phone: '+91 22 6731 7500',
    },
    units: [
      { id: 'NRAGARWAL_UNIT1', name: 'N R Agarwal Unit 1', loc: 'GIDC Phase I, Vapi, Gujarat', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'NRAGARWAL_UNIT5', name: 'N R Agarwal Unit 5', loc: 'Sarigam GIDC, Valsad, Gujarat', cat: 'Designated Consumer (DC) - Pulp & Paper' },
    ],
  },
  {
    id: '66f000000000000000000120',
    name: 'Cooperative & Allied Sugar Mills',
    code: 'SUGAR',
    industry: 'Sugar Processing, Ethanol Distilleries & Co-gen Power',
    headquarters: 'Sugar Complex, Vibhuti Khand, Gomti Nagar, Lucknow, UP - 226010',
    contactPerson: {
      name: 'S. K. Verma',
      email: 'contact@coopsugar.gov.in',
      phone: '+91 522 272 0450',
    },
    units: [
      { id: 'SUGAR_MORNA', name: 'The Ganga Kisan Sahkari Chini Mills Limited, Morna', loc: 'Morna, Muzaffarnagar, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_BELRAYAN', name: 'Sarjoo Sahkari Chini Mills Ltd., Belrayan Kheri', loc: 'Belrayan, Lakhimpur Kheri, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_BAGPAT', name: 'The Bagpath Co-op Sugar Mill Ltd., Bagpath', loc: 'Baghpat, Uttar Pradesh', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_RAMALA', name: 'Ramala Sahkari Chini Mills Ltd., Ramala', loc: 'Ramala, Baghpat, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_TILHAR', name: 'The Kisan Sahakari Chinni Mill Ltd., Tilhar', loc: 'Tilhar, Shahjahanpur, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_SAMPURNANAGAR', name: 'The Kisan Sahakri Chinni Mill Ltd., Sampurnanagar', loc: 'Sampurnanagar, Lakhimpur, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_SNEHROAD', name: 'The Kisan Sahakari Chinni Mill Ltd., Snehroad', loc: 'Kotdwar / Bijnor Road, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_RENUKA', name: 'Shree Renuka Sugar Mills Limited', loc: 'Munoli, Belgaum, Karnataka', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_NANPARA', name: 'Shravasti Kisan Sahkari Chini Mills Limited, Nanpara', loc: 'Nanpara, Bahraich, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_THORAT_SAKHAR', name: 'Sahakarmaharshi Bhausaheb Thorat Sahakari Sakhar Karkhana Ltd.', loc: 'Sangamner, Ahmednagar, Maharashtra', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_SEMIKHERA', name: 'Kisan Sahkari Chinni Mill Ltd, Semikhera', loc: 'Semikhera, Bareilly, UP', cat: 'Designated Consumer (DC) - Sugar' },
      { id: 'SUGAR_DY_PATIL', name: 'DY Patil Sugar Mill', loc: 'Gaganbawda, Kolhapur, Maharashtra', cat: 'Commercial Industrial Unit - Sugar' },
      { id: 'SUGAR_THORAT_MILL', name: 'Thorat Sugar Mill', loc: 'Amrutnagar, Sangamner, Maharashtra', cat: 'Commercial Industrial Unit - Sugar' },
    ],
  },
  {
    id: '66f000000000000000000130',
    name: 'Independent Paper & Allied Mills',
    code: 'PAPER',
    industry: 'Corrugation, Kraft, Duplex & Printing Papers',
    headquarters: 'Industrial Area, Kashipur / Muzaffarnagar / Vapi',
    contactPerson: {
      name: 'Anil Bansal',
      email: 'info@independentpaper.org',
      phone: '+91 131 260 4400',
    },
    units: [
      { id: 'PAPER_ABC_IMPEX', name: 'ABC Impex', loc: 'Industrial Area, Kashipur, Udham Singh Nagar, Uttarakhand', cat: 'Commercial Industrial Unit - Paper' },
      { id: 'PAPER_ANAND_TRIPLEX', name: 'Anand Triplex', loc: 'Partapur Industrial Area, Meerut, UP', cat: 'Commercial Industrial Unit - Triplex Board' },
      { id: 'PAPER_SILLVERTON_IND', name: 'Sillverton Industries', loc: 'Bhopa Road, Muzaffarnagar, UP', cat: 'Commercial Industrial Unit - Paper & Board' },
      { id: 'PAPER_SILLVERTOAN_PAP', name: 'Sillvertoan Papers', loc: 'Jansath Road, Muzaffarnagar, UP', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'PAPER_BAHL_MILLS', name: 'Bahl Paper Mills', loc: 'Kashipur, Udham Singh Nagar, Uttarakhand', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'PAPER_SANGAL', name: 'Sangal Papers Limited', loc: 'Mawana, Meerut, Uttar Pradesh', cat: 'Designated Consumer (DC) - Pulp & Paper' },
      { id: 'PAPER_JODHANI', name: 'Jodhani Paper', loc: 'Bommasandra Industrial Area, Bengaluru, Karnataka', cat: 'Commercial Industrial Unit - Paper' },
      { id: 'PAPER_MENU', name: 'Menu Paper', loc: 'Surat Industrial Zone, Gujarat', cat: 'Commercial Industrial Unit - Speciality Paper' },
      { id: 'PAPER_MAHESHWARI', name: 'Maheshwari Logistics - Paper Division', loc: 'GIDC Vapi, Gujarat', cat: 'Commercial Industrial Unit - Paper Logistics' },
      { id: 'PAPER_JANI_SALES', name: 'Jani Sales Pvt Ltd', loc: 'MIDC Boisar, Tarapur, Palghar, Maharashtra', cat: 'Commercial Industrial Unit - Paper' },
    ],
  },
  {
    id: '66f000000000000000000140',
    name: 'Engineering, Metals & Allied',
    code: 'METALS',
    industry: 'Heavy Engineering, Steel, Ceramics & Technical Textiles',
    headquarters: 'Central Industrial Zone, Mumbai / Kolkata / Ahmedabad',
    contactPerson: {
      name: 'Pradeep Singhania',
      email: 'compliance@alliedmetals.com',
      phone: '+91 33 2289 1200',
    },
    units: [
      { id: 'ENG_SPNG', name: 'SPNG Group - Textile', loc: 'Rajasthan Textile Cluster, Rajasthan', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'ENG_GALVALIA', name: 'Galvalia Ispat', loc: 'Urla Industrial Area, Raipur, Chhattisgarh', cat: 'Designated Consumer (DC) - Sponge Iron & Steel' },
      { id: 'ENG_KIC_METALIKS', name: 'KIC Metaliks', loc: 'Durgapur Steel Complex, Paschim Bardhaman, West Bengal', cat: 'Designated Consumer (DC) - Iron & Steel' },
      { id: 'ENG_GM_FABRICS', name: 'GM Fabrics', loc: 'MIDC Tarapur, Maharashtra', cat: 'Commercial Industrial Unit - Fabrics' },
      { id: 'ENG_ANJANI_SYNTHETICS', name: 'Anjani Synthetics', loc: 'Narol GIDC, Ahmedabad, Gujarat', cat: 'Commercial Industrial Unit - Synthetic Textiles' },
      { id: 'ENG_NOBLE_TECH', name: 'Noble Tech', loc: 'Coimbatore Industrial Complex, Tamil Nadu', cat: 'Commercial Industrial Unit - Technical Engineering' },
      { id: 'ENG_HIMMATSINGKA', name: 'Himmatsingka Linnens', loc: 'KIADB Industrial Area, Hassan, Karnataka', cat: 'Designated Consumer (DC) - Textiles' },
      { id: 'ENG_GRIS_CERAMICS', name: 'Gris Ceramics Pvt Ltd.', loc: 'Morbi Ceramic Industrial Zone, Gujarat', cat: 'Commercial Industrial Unit - Ceramics' },
    ],
  },
];

// Generate MOCK_FACILITIES array
const mockFacilities = [];
companies.forEach(company => {
  company.units.forEach(unit => {
    mockFacilities.push({
      _id: 'fac_' + unit.id.toLowerCase(),
      facilityId: unit.id,
      name: unit.name,
      clientGroupId: company.id,
      clientGroupName: company.name,
      location: unit.loc,
      category: unit.cat,
      status: 'ACTIVE',
      activeCompliancesCount: 4,
      assignedConsultantId: 'USR_CONS_01',
      assignedReviewerId: 'USR_CONS_01',
      createdAt: '2025-01-15T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    });
  });
});

// Generate MOCK_CLIENT_GROUPS array
const mockGroups = companies.map(company => {
  const facsForGroup = mockFacilities.filter(f => f.clientGroupId === company.id);
  return {
    _id: company.id,
    name: company.name,
    code: company.code,
    industry: company.industry,
    headquarters: company.headquarters,
    contactPerson: company.contactPerson,
    totalFacilitiesCount: facsForGroup.length,
    activeCompliancesCount: 4,
    facilities: facsForGroup,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
  };
});

const tsCode = `export const MOCK_CLIENT_GROUPS: any[] = ${JSON.stringify(mockGroups, null, 2)};\n\nexport const MOCK_FACILITIES: any[] = ${JSON.stringify(mockFacilities, null, 2)};\n\n`;

const targetFile = path.resolve(__dirname, '../src/lib/mockFallback.ts');
const originalContent = fs.readFileSync(targetFile, 'utf8');

// Find where export const MOCK_APPLICABILITY starts
const applicabilityIndex = originalContent.indexOf('export const MOCK_APPLICABILITY');
if (applicabilityIndex === -1) {
  console.error('Could not find MOCK_APPLICABILITY');
  process.exit(1);
}

const remainder = originalContent.substring(applicabilityIndex);
const newContent = tsCode + remainder;
fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Successfully updated src/lib/mockFallback.ts!');

