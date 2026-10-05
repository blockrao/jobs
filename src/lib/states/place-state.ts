/**
 * Reviewed map of Indian places (cities, towns, districts, a few ports and
 * campuses) that belong to exactly ONE state/UT. Used by resolveState as the
 * 'place' evidence tier: an employer or workplace whose name embeds the place
 * it is physically located in ("Indian Institute of Management Lucknow").
 *
 * Rules for adding an entry:
 *  - the name must refer to one state only (no Aurangabad, Bilaspur, ...);
 *  - it must not be a common word or a person's name (Puri, Mandi, Sagar, ...);
 *  - spelling variants are listed explicitly (Cochin/Kochi, Madras/Chennai).
 * Keys are lowercase, letters/digits only, single-space separated (the same
 * normalisation resolveState applies to the text it scans).
 */

const BY_STATE: Record<string, string> = {
  "andhra-pradesh":
    "visakhapatnam, vizag, vijayawada, guntur, tirupati, nellore, kurnool, kadapa, rajahmundry, rajamahendravaram, kakinada, anantapur, ananthapuramu, ongole, eluru, machilipatnam, srikakulam, vizianagaram, chittoor, mangalagiri, nandyal, bapatla, narasaraopet, tirumala, puttaparthi, sri city, amaravati",
  telangana:
    "hyderabad, secunderabad, warangal, hanamkonda, karimnagar, nizamabad, khammam, nalgonda, mahabubnagar, adilabad, medak, siddipet, sangareddy, suryapet, rangareddy, ranga reddy, mulugu, bibinagar, kothagudem, jagtial, peddapalli, mancherial, vikarabad, yadadri, jangaon, wanaparthy, nagarkurnool, kamareddy, medchal, ramagundam, shamshabad",
  karnataka:
    "bengaluru, bangalore, mysuru, mysore, mangaluru, mangalore, new mangalore, hubballi, hubli, dharwad, belagavi, belgaum, kalaburagi, gulbarga, ballari, bellary, vijayapura, shivamogga, shimoga, tumakuru, tumkur, davanagere, davangere, udupi, mandya, chitradurga, kolar, raichur, koppal, bidar, gadag, haveri, karwar, uttara kannada, dakshina kannada, chikkamagaluru, chikmagalur, kodagu, madikeri, chamarajanagar, ramanagara, chikkaballapur, yadgir, yadgiri, bagalkot, surathkal",
  "tamil-nadu":
    "chennai, madras, coimbatore, madurai, tiruchirappalli, trichy, salem, tirunelveli, erode, vellore, thoothukudi, tuticorin, tiruppur, dindigul, thanjavur, kanchipuram, kancheepuram, cuddalore, nagapattinam, ariyalur, perambalur, karur, namakkal, dharmapuri, krishnagiri, villupuram, viluppuram, tiruvannamalai, tiruvarur, thiruvarur, pudukkottai, sivaganga, ramanathapuram, virudhunagar, theni, nilgiris, ooty, udhagamandalam, kanyakumari, nagercoil, tenkasi, tirupattur, ranipet, chengalpattu, tiruvallur, thiruvallur, kallakurichi, mayiladuthurai, hosur, avadi, tambaram, sriperumbudur, ennore, neyveli, kalpakkam, mettur, pollachi, kumbakonam, rameswaram",
  kerala:
    "thiruvananthapuram, trivandrum, kochi, cochin, ernakulam, kozhikode, calicut, thrissur, trichur, kollam, quilon, kannur, cannanore, alappuzha, alleppey, kottayam, palakkad, palghat, malappuram, kasaragod, kasargod, wayanad, idukki, pathanamthitta, thiruvalla, kalamassery, kakkanad, aluva, muvattupuzha, angamaly, thodupuzha, kalpetta, taliparamba, vizhinjam, kayamkulam, chengannur, kanhangad",
  maharashtra:
    "mumbai, navi mumbai, thane, pune, nagpur, nashik, nasik, kolhapur, solapur, sangli, satara, ratnagiri, sindhudurg, raigad, jalgaon, dhule, nandurbar, ahmednagar, ahilyanagar, latur, osmanabad, dharashiv, beed, parbhani, nanded, hingoli, jalna, buldhana, akola, washim, yavatmal, wardha, chandrapur, gadchiroli, gondia, bhandara, palghar, panvel, dombivli, vasai, virar, bhiwandi, ulhasnagar, lonavala, mahabaleshwar, shirdi, pimpri chinchwad, kharghar, tuljapur, sevagram",
  gujarat:
    "ahmedabad, gandhinagar, surat, vadodara, rajkot, bhavnagar, jamnagar, junagadh, gandhidham, kutch, bhuj, nadiad, mehsana, palanpur, himmatnagar, godhra, bharuch, ankleshwar, valsad, navsari, vapi, porbandar, surendranagar, amreli, morbi, dahod, rajpipla, botad, veraval, kandla, mundra, sanand, dholera, vallabh vidyanagar",
  rajasthan:
    "jaipur, jodhpur, bikaner, ajmer, alwar, sikar, jhunjhunu, churu, hanumangarh, sri ganganagar, ganganagar, barmer, jaisalmer, nagaur, bhilwara, chittorgarh, dungarpur, banswara, sawai madhopur, dholpur, karauli, dausa, tonk, jhalawar, baran, bundi, rajsamand, sirohi, jalore, pilani, mount abu, pushkar, kishangarh, beawar, neemrana, bhiwadi, jobner",
  "madhya-pradesh":
    "bhopal, indore, gwalior, jabalpur, ujjain, rewa, satna, ratlam, dewas, khandwa, khargone, barwani, burhanpur, chhindwara, betul, hoshangabad, narmadapuram, vidisha, raisen, sehore, shivpuri, datia, morena, bhind, ashoknagar, tikamgarh, chhatarpur, panna, damoh, katni, umaria, shahdol, anuppur, sidhi, mandla, balaghat, seoni, narsinghpur, neemuch, mandsaur, shajapur, agar malwa, alirajpur, jhabua, pithampur, mhow, pachmarhi, khajuraho, amarkantak, maihar",
  "uttar-pradesh":
    "lucknow, kanpur, kanpur nagar, varanasi, banaras, benares, prayagraj, allahabad, agra, meerut, ghaziabad, noida, greater noida, gautam buddha nagar, aligarh, bareilly, moradabad, saharanpur, gorakhpur, jhansi, mathura, vrindavan, firozabad, etawah, mainpuri, farrukhabad, kannauj, unnao, raebareli, rae bareli, amethi, ayodhya, faizabad, barabanki, sitapur, hardoi, lakhimpur kheri, bahraich, shravasti, gonda, siddharthnagar, maharajganj, kushinagar, deoria, azamgarh, ballia, ghazipur, jaunpur, mirzapur, sonbhadra, chandauli, bhadohi, chitrakoot, mahoba, lalitpur, jalaun, orai, auraiya, pilibhit, shahjahanpur, budaun, badaun, bijnor, muzaffarnagar, shamli, baghpat, bulandshahr, hapur, amroha, sambhal, kasganj, etah, hathras, sant kabir nagar, kaushambi",
  uttarakhand:
    "dehradun, haridwar, rishikesh, roorkee, nainital, haldwani, kashipur, rudrapur, pantnagar, almora, pithoragarh, champawat, bageshwar, chamoli, rudraprayag, tehri, uttarkashi, pauri garhwal, mussoorie, kotdwar, ranikhet, udham singh nagar",
  "himachal-pradesh":
    "shimla, dharamshala, dharamsala, solan, kullu, manali, kangra, palampur, chamba, kinnaur, lahaul, spiti, sirmaur, nahan, baddi, paonta sahib, kasauli, dalhousie, sundernagar, parwanoo, keylong",
  haryana:
    "gurugram, gurgaon, faridabad, panipat, rohtak, hisar, karnal, ambala, sonipat, sonepat, kurukshetra, yamunanagar, jagadhri, panchkula, sirsa, bhiwani, jind, kaithal, rewari, mahendragarh, narnaul, jhajjar, nuh, palwal, charkhi dadri, bahadurgarh, manesar, dharuhera, mewat",
  punjab:
    "ludhiana, amritsar, jalandhar, patiala, mohali, sas nagar, bathinda, bhatinda, pathankot, hoshiarpur, gurdaspur, kapurthala, ferozepur, firozpur, faridkot, moga, muktsar, sangrur, barnala, mansa, rupnagar, ropar, fatehgarh sahib, tarn taran, nawanshahr, malerkotla, zirakpur, rajpura, abohar, phagwara, anandpur sahib",
  "jammu-kashmir":
    "jammu, kathua, udhampur, reasi, rajouri, poonch, doda, kishtwar, ramban, anantnag, baramulla, kupwara, bandipora, ganderbal, pulwama, shopian, kulgam, budgam, beerwah, pahalgam, gulmarg, sopore, awantipora, katra",
  ladakh: "leh, kargil",
  "west-bengal":
    "kolkata, calcutta, howrah, kharagpur, durgapur, asansol, siliguri, darjeeling, kalimpong, jalpaiguri, cooch behar, coochbehar, malda, murshidabad, berhampore, nadia, krishnanagar, kalyani, barrackpore, barasat, bidhannagar, haldia, bankura, purulia, birbhum, bolpur, santiniketan, burdwan, bardhaman, hooghly, chinsurah, serampore, medinipur, midnapore, tamluk, contai, alipurduar, raiganj, balurghat, dinajpur, jhargram, diamond harbour, dum dum, ranaghat, 24 parganas",
  odisha:
    "bhubaneswar, cuttack, rourkela, sambalpur, berhampur, brahmapur, balasore, baleshwar, bhadrak, jajpur, koraput, jeypore, kalahandi, bhawanipatna, bolangir, balangir, angul, dhenkanal, keonjhar, mayurbhanj, baripada, jharsuguda, sundargarh, kendrapara, jagatsinghpur, paradip, khordha, nayagarh, ganjam, gajapati, phulbani, kandhamal, rayagada, malkangiri, nabarangpur, nuapada, kalinganagar, burla, talcher, bargarh",
  jharkhand:
    "ranchi, jamshedpur, dhanbad, bokaro, deoghar, hazaribagh, giridih, dumka, pakur, sahibganj, godda, chaibasa, lohardaga, gumla, simdega, khunti, latehar, palamu, medininagar, daltonganj, garhwa, chatra, koderma, jamtara, saraikela, seraikela, singhbhum, adityapur, sindri",
  bihar:
    "patna, gaya, bodh gaya, bhagalpur, muzaffarpur, darbhanga, purnia, purnea, katihar, araria, kishanganj, saharsa, madhepura, supaul, begusarai, munger, jamui, lakhisarai, sheikhpura, nalanda, rajgir, jehanabad, arwal, rohtas, sasaram, buxar, bhojpur, saran, chapra, siwan, gopalganj, vaishali, hajipur, samastipur, sitamarhi, madhubani, motihari, bettiah, champaran, kaimur, bhabua, banka, khagaria",
  chhattisgarh:
    "raipur, bhilai, durg, korba, jagdalpur, bastar, ambikapur, surguja, rajnandgaon, dhamtari, mahasamund, kanker, kondagaon, dantewada, sukma, janjgir, bemetara, gariaband, gariyaband, mungeli, balod, baloda bazar, kawardha, kabirdham, koriya, surajpur, jashpur, naya raipur",
  assam:
    "guwahati, dispur, dibrugarh, jorhat, silchar, tezpur, tinsukia, sivasagar, golaghat, dhemaji, karimganj, sribhumi, hailakandi, cachar, barpeta, nalbari, kamrup, goalpara, dhubri, bongaigaon, kokrajhar, chirang, baksa, udalguri, darrang, mangaldoi, morigaon, karbi anglong, dima hasao, diphu, haflong, majuli, digboi, numaligarh, duliajan",
  meghalaya: "shillong, tura, jowai, nongpoh, nongstoin, williamnagar, cherrapunji",
  manipur: "imphal, churachandpur, thoubal, ukhrul, senapati, tamenglong, chandel, jiribam, kakching",
  mizoram: "aizawl, lunglei, champhai, serchhip, kolasib, mamit, saiha, lawngtlai",
  nagaland: "kohima, dimapur, tuensang, mokokchung, wokha, zunheboto, phek, kiphire, longleng, peren, noklak",
  "arunachal-pradesh": "itanagar, naharlagun, tawang, pasighat, bomdila, tezu, changlang, roing, namsai",
  sikkim: "gangtok, namchi, gyalshing, pelling, rangpo",
  tripura: "agartala, dharmanagar, kailashahar, ambassa, belonia, khowai, teliamura, sepahijala",
  goa: "panaji, panjim, margao, madgaon, mapusa, ponda, mormugao, bicholim, canacona, dabolim",
  "andaman-nicobar": "port blair, car nicobar, diglipur",
  lakshadweep: "kavaratti, minicoy, agatti",
  puducherry: "karaikal, yanam",
  "dadra-nagar-haveli-daman-diu": "silvassa, daman, diu",
};

/**
 * Places that exist in more than one state (or are common words / personal
 * names) and are therefore deliberately NOT in the map. Documented and tested
 * so nobody "helpfully" adds them.
 */
export const AMBIGUOUS_PLACES: string[] = [
  "balrampur", // UP and Chhattisgarh
  "aurangabad", // Maharashtra and Bihar
  "bilaspur", // Chhattisgarh and Himachal Pradesh
  "hamirpur", // Himachal Pradesh and Uttar Pradesh
  "udaipur", // Rajasthan and Tripura
  "srinagar", // J&K and Uttarakhand
  "bijapur", // Karnataka and Chhattisgarh
  "pratapgarh", // UP and Rajasthan
  "raigarh", // Chhattisgarh (Raigad is Maharashtra)
  "ramgarh", // Jharkhand and Rajasthan
  "fatehpur", // UP and Rajasthan
  "rampur", // many
  "bharatpur", // Rajasthan and others
  "bishnupur", // West Bengal and Manipur
  "lakhimpur", // UP (Kheri) and Assam
  "singrauli", // MP and UP
  "deogarh", // Odisha, Jharkhand, Rajasthan
  "narayanpur", // several
  "kota", // Rajasthan and others
  "pali", // Rajasthan and others
  "nagaon", // Assam and others
  "mandi", // Himachal Pradesh, but also a common word
  "puri", // Odisha, but also a surname
  "sagar", // MP, but also a common name
  "dwarka", // Gujarat and Delhi
  "bombay", // also the High Court name; use Mumbai
  "amravati", // Maharashtra; near-homograph of Amaravati (AP)
  "una",
  "anand",
  "hassan",
  "samba",
];

function build(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slug, csv] of Object.entries(BY_STATE)) {
    for (const raw of csv.split(",")) {
      const place = raw.trim();
      if (!place) continue;
      if (out[place] && out[place] !== slug) throw new Error(`place-state: ${place} maps to two states`);
      out[place] = slug;
    }
  }
  for (const a of AMBIGUOUS_PLACES) {
    if (out[a]) throw new Error(`place-state: ambiguous place ${a} must not be mapped`);
  }
  return out;
}

export const PLACE_TO_STATE: Record<string, string> = build();
