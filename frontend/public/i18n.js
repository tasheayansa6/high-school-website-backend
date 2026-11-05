/* Abyssinia Academy — EN / አማርኛ / Afaan Oromoo */
(function () {
  const KEY = 'aa_lang';
  const labels = { en: 'English', am: 'አማርኛ', om: 'Afaan Oromoo' };

  const dict = {
    am: {
      Home: 'መነሻ',
      Feature: 'ባህሪያት',
      About: 'ስለ እኛ',
      Blogs: 'ብሎጎች',
      Contact: 'ያግኙን',
      Pricing: 'ዋጋ',
      English: 'English',
      'አማርኛ': 'አማርኛ',
      'Afaan Oromoo': 'Afaan Oromoo',
      'Addis Ababa, Ethiopia • Est. 1998': 'አዲስ አበባ፣ ኢትዮጵያ • ከ1998 ጀምሮ',
      'Addis Ababa • Ethiopia': 'አዲስ አበባ • ኢትዮጵያ',
      'Abyssinia Academy': 'አቢሲኒያ አካዳሚ',
      'SECONDARY SCHOOL • GRADES 9–12 • ADDIS ABABA, ETHIOPIA':
        'ሁለተኛ ደረጃ ትምህርት ቤት • ክፍል 9–12 • አዲስ አበባ፣ ኢትዮጵያ',
      'Educating Leaders of': 'የሚያስተምረው መሪዎችን ከ',
      Character: 'ባህሪ',
      ', Scholarship, and Purpose.': '፣ ምሁርነት እና ዓላማ ጋር።',
      'At Abyssinia Academy, rigorous national and international secondary curricula meet holistic mentorship on our serene highland campus in Addis Ababa.':
        'በአቢሲኒያ አካዳሚ፣ ጥብቅ ብሔራዊና ዓለም አቀፍ ሁለተኛ ደረጃ ሥርዓተ ትምህርት ከሙሉ ሰውነት አማካሪነት ጋር በአዲስ አበባ በሚገኘው ጸጥ ያለ ከፍተኛ ቅጥር ግቢያችን ይገናኛል።',
      'Request an Information Packet': 'የመረጃ ጥቅል ይጠይቁ',
      'Book a Campus Visit': 'የቅጥር ጉብኝት ይያዙ',
      'Grades 9–12': 'ክፍል 9–12',
      'Secondary Cycle': 'ሁለተኛ ደረጃ ዑደት',
      'Dual Language': 'ሁለት ቋንቋ',
      'Amharic & English Instruction': 'አማርኛ እና እንግሊዝኛ ትምህርት',
      'College Prep': 'ለኮሌጅ ዝግጅት',
      'National Curriculum & Research': 'ብሔራዊ ሥርዓተ ትምህርት እና ምርምር',
      'Co-Curricular': 'ተጨማሪ ትምህርት',
      'Clubs, Athletics & Societies': 'ክለቦች፣ ስፖርት እና ማህበራት',
      'OUR COMMITMENT & VALUES': 'ቁርጠኝነታችን እና እሴቶቻችን',
      'A tradition of academic rigor rooted in ethical responsibility and innovation.':
        'በሥነ ምግባራዊ ኃላፊነት እና ፈጠራ ላይ የተመሠረተ የትምህርት ጥብቅነት ባህል።',
      'Holistic Education': 'ሙሉ ሰው ትምህርት',
      'Language Mastery': 'የቋንቋ ብቃት',
      'Office of the Head of School': 'የትምህርት ቤቱ ሀላፊ ጽሕፈት ቤት',
      'The Dual Pillars of Abyssinia Academy': 'የአቢሲኒያ አካዳሚ ሁለት ምሰሶዎች',
      'Academic Rigor & Intellectual Curiosity': 'የትምህርት ጥብቅነት እና የአእምሮ ፍላጎት',
      'Cultural Heritage & Global Citizenship': 'ባህላዊ ቅርስ እና ዓለም አቀፍ ዜግነት',
      'Academic Integrity & Honor': 'የትምህርት ታማኝነት እና ክብር',
      'Student Leadership & Houses': 'የተማሪ አመራር እና ቤቶች',
      'Community Service & Stewardship': 'የማህበረሰብ አገልግሎት እና ጥበቃ',
      'The Academic Departments': 'የትምህርት ክፍሎች',
      'Four Tenets of Student Life': 'የተማሪ ሕይወት አራት መርሆዎች',
      'The Academy Bulletin': 'የአካዳሚው መግለጫ',
      'Upcoming Campus Gatherings': 'መጪ የቅጥር ስብሰባዎች',
      'Begin Your Journey with Abyssinia Academy.': 'ጉዞዎን ከአቢሲኒያ አካዳሚ ጋር ይጀምሩ።',
      'Request Admissions Information': 'የመግቢያ መረጃ ይጠይቁ',
      'Submit Admissions Inquiry →': 'የመግቢያ ጥያቄ ያስገቡ →',
      'Parent / Guardian Full Name *': 'የወላጅ / አሳዳጊ ሙሉ ስም *',
      'Contact Email Address *': 'የኢሜይል አድራሻ *',
      'Phone Number *': 'ስልክ ቁጥር *',
      'Prospective Student Grade *': 'የሚገባው ተማሪ ክፍል *',
      'Select Entry Grade': 'የመግቢያ ክፍል ይምረጡ',
      'Grade 9 (Freshman Entry)': 'ክፍል 9 (አዲስ መግቢያ)',
      'Grade 10': 'ክፍል 10',
      'Grade 11 (Advanced Stream)': 'ክፍል 11 (ከፍተኛ ዥረት)',
      'Grade 12 (Transfer)': 'ክፍል 12 (ዝውውር)',
      'Yes, keep me informed about campus visit dates, admissions testing schedules, and school announcements. We respect your privacy. Unsubscribe anytime with one click.':
        'አዎ፣ ስለ ቅጥር ጉብኝት ቀናት፣ የመግቢያ ፈተና መርሐግብሮች እና የትምህርት ቤት ማስታወቂያዎች እንድታሳውቁኝ እፈልጋለሁ። ግላዊነታችንን እናከብራለን። በማንኛውም ጊዜ በአንድ ጠቅታ መሰረዝ ይችላሉ።',
      Subscribe: 'ይመዝገቡ',
      'Inquiry Confirmed': 'ጥያቄው ተረጋግጧል',
      Exploration: 'ምርመራ',
      Community: 'ማህበረሰብ',
      Governance: 'አስተዳደር',
      'The Abyssinia Bulletin': 'የአቢሲኒያ መግለጫ',
      'Receive termly academic updates, student achievements, and campus event invitations.':
        'የጊዜ ትምህርታዊ ዝማኔዎችን፣ የተማሪ ውጤቶችን እና የቅጥር ዝግጅት ግብዣዎችን ይቀበሉ።',
      'Nurturing intellectual leadership, scientific curiosity, and moral integrity in secondary education across Grades 9 through 12.':
        'ከክፍል 9 እስከ 12 በሁለተኛ ደረጃ ትምህርት ውስጥ የአእምሮ አመራር፣ ሳይንሳዊ ፍላጎት እና ሥነ ምግባራዊ ታማኝነትን እናሳድጋለን።',
      'Get in touch': 'ያግኙን',
      'Contact Us': 'ያግኙን',
      'Have questions about admissions, academics, or campus life? Send us a message and our office will get back to you shortly.':
        'ስለ መግቢያ፣ ትምህርት ወይም የቅጥር ሕይወት ጥያቄ አለዎት? መልእክት ይላኩልን — ጽሕፈት ቤታችን በቅርቡ ይመልስልዎታል።',
      'Contact Information': 'የመገኛ መረጃ',
      'We’d love to hear from you': 'ከእርስዎ መስማት እንፈልጋለን',
      "We'd love to hear from you": 'ከእርስዎ መስማት እንፈልጋለን',
      'Whether you’re curious about admissions, curriculum, campus visits, or need general information — we’re ready to answer any question.':
        'ስለ መግቢያ፣ ሥርዓተ ትምህርት፣ ቅጥር ጉብኝት ወይም አጠቃላይ መረጃ ቢጠይቁ — ማንኛውንም ጥያቄ ለመመለስ ዝግጁ ነን።',
      "Whether you're curious about admissions, curriculum, campus visits, or need general information — we're ready to answer any question.":
        'ስለ መግቢያ፣ ሥርዓተ ትምህርት፣ ቅጥር ጉብኝት ወይም አጠቃላይ መረጃ ቢጠይቁ — ማንኛውንም ጥያቄ ለመመለስ ዝግጁ ነን።',
      Email: 'ኢሜይል',
      'Admissions Office': 'የመግቢያ ጽሕፈት ቤት',
      'Planning a campus visit?': 'የቅጥር ጉብኝት እያሰቡ ነው?',
      'Let us walk you through our classrooms, laboratories, and campus grounds — tailored for prospective families.':
        'ክፍሎቻችንን፣ ላቦራቶሪዎቻችንን እና የቅጥር ቦታዎቻችንን እናሳይዎታለን — ለወደፊት ቤተሰቦች የተዘጋጀ።',
      'Request Visit': 'ጉብኝት ይጠይቁ',
      'Send us a message': 'መልእክት ይላኩልን',
      'Full Name': 'ሙሉ ስም',
      'Full Name *': 'ሙሉ ስም *',
      'Phone Number': 'ስልክ ቁጥር',
      'Your full name': 'ሙሉ ስምዎ',
      '+251 9XX XXX XXX': '+251 9XX XXX XXX',
      'you@email.com': 'you@email.com',
      Subject: 'ርዕስ',
      'Subject *': 'ርዕስ *',
      'Admissions, campus visit, general inquiry…': 'መግቢያ፣ ቅጥር ጉብኝት፣ አጠቃላይ ጥያቄ…',
      Message: 'መልእክት',
      'Message *': 'መልእክት *',
      'How can we help you?': 'እንዴት ልንረዳዎት እንችላለን?',
      'Send Message': 'መልእክት ላክ',
      'Transparent Pricing': 'ግልጽ ዋጋ',
      'Tuition & Fees': 'ትምህርት ክፍያ እና ክፍያዎች',
      'Clear annual fee packages for Grades 9–12. Choose the pathway that fits your family — every plan includes core academics and pastoral care.':
        'ለክፍል 9–12 ግልጽ ዓመታዊ የክፍያ ጥቅሎች። ለቤተሰብዎ የሚስማማውን መንገድ ይምረጡ — እያንዳንዱ ዕቅድ ዋና ትምህርት እና እንክብካቤን ያካትታል።',
      'Day Scholar': 'የቀን ተማሪ',
      'Core Pathway': 'መሠረታዊ መንገድ',
      'Full secondary instruction with weekday campus access.':
        'ሙሉ ሁለተኛ ደረጃ ትምህርት ከሳምንት ቀናት ቅጥር መዳረሻ ጋር።',
      'ETB 85,000': 'ብር 85,000',
      ' / year': ' / ዓመት',
      '/ year': '/ ዓመት',
      Inquire: 'ይጠይቁ',
      'Most Popular': 'በጣም ተፈላጊ',
      'Boarding Scholar': 'የውስጥ ተማሪ',
      'Residential Pathway': 'መኖሪያ መንገድ',
      'Full boarding with house mentoring and evening study halls.':
        'ሙሉ መኖሪያ ከቤት አማካሪነት እና ከማታ የጥናት አዳራሾች ጋር።',
      'ETB 165,000': 'ብር 165,000',
      'Choose Plan': 'ዕቅድ ይምረጡ',
      'Scholars Plus': 'ስኮላርስ ፕላስ',
      'Advanced Pathway': 'ከፍተኛ መንገድ',
      'Boarding plus research mentorship and exam intensives.':
        'መኖሪያ በተጨማሪ የምርምር አማካሪነት እና የፈተና ጥልቅ ስልጠና።',
      'ETB 210,000': 'ብር 210,000',
      'Fees shown are illustrative annual packages for the 2026–2027 cycle. Laboratory, uniform, and examination fees may apply separately. Contact Admissions for a personalized quotation.':
        'የሚታዩ ክፍያዎች ለ2026–2027 ዑደት ምሳሌያዊ ዓመታዊ ጥቅሎች ናቸው። የላቦራቶሪ፣ ዩኒፎርም እና የፈተና ክፍያዎች በተናጠል ሊተገበሩ ይችላሉ። ለግል ጥቅስ የመግቢያ ጽሕፈት ቤትን ያግኙ።',
      'Stay informed': 'መረጃ ይቀበሉ',
      'Subscribe for fee updates, open days, and admissions deadlines.':
        'ለክፍያ ዝማኔዎች፣ ክፍት ቀናት እና የመግቢያ የመጨረሻ ቀናት ይመዝገቡ።',
      'Blogs & News': 'ብሎጎች እና ዜና',
      'Academy Bulletin': 'የአካዳሚ መግለጫ',
      'Stories, announcements, and academic updates from Abyssinia Academy.':
        'ከአቢሲኒያ አካዳሚ ታሪኮች፣ ማስታወቂያዎች እና የትምህርት ዝማኔዎች።',
      'Loading posts…': 'ልጥፎች በመጫን ላይ…',
      'No published posts yet. Check back soon.': 'እስካሁን የታተሙ ልጥፎች የሉም። በቅርቡ ይመልከቱ።',
      'Unable to load blogs right now. Start the backend API to see posts.':
        'ብሎጎችን አሁን መጫን አልተቻለም። ልጥፎችን ለማየት የኋላ ክፍል API ያስጀምሩ።',
      'About Abyssinia Academy': 'ስለ አቢሲኒያ አካዳሚ',
      'Cultivating intellectual rigor, cultural heritage, and ethical leadership in the heart of Addis Ababa.':
        'በአዲስ አበባ ልብ ውስጥ የአእምሮ ጥብቅነት፣ ባህላዊ ቅርስ እና ሥነ ምግባራዊ አመራርን እናሳድጋለን።',
      'Academic Excellence Through Purposeful Learning': 'በዓላማ ያለው ትምህርት በኩል የትምህርት ልቀት',
      'Institutional Overview': 'የተቋም አጠቃላይ እይታ',
      'Our Story & Academic Heritage': 'ታሪካችን እና የትምህርት ቅርሳችን',
      'Our Mission & Vision': 'ተልእኮአችን እና ራዕያችን',
      'Our Core Values': 'ዋና እሴቶቻችን',
      'Leadership & Governance': 'አመራር እና አስተዳደር',
      'Our Learning Environment': 'የመማሪያ አካባቢያችን',
      'Community & Family Engagement': 'ማህበረሰብ እና ቤተሰብ ተሳትፎ',
      'Grades 9–12 national curriculum': 'ክፍል 9–12 ብሔራዊ ሥርዓተ ትምህርት',
      'Dual-language Amharic & English': 'ሁለት ቋንቋ አማርኛ እና እንግሊዝኛ',
      'Library & science lab access': 'ቤተ መጻሕፍት እና ሳይንስ ላብ መዳረሻ',
      'Academic advisory support': 'የትምህርት አማካሪ ድጋፍ',
      'Everything in Core Pathway': 'በመሠረታዊ መንገድ ያለው ሁሉ',
      'Room, meals & house tutorials': 'ክፍል፣ ምግብ እና የቤት ትምህርቶች',
      'Evening supervised study': 'በማታ የሚቆጣጠር ጥናት',
      'Weekend activities & clubs': 'የሳምንት መጨረሻ እንቅስቃሴዎች እና ክለቦች',
      'Priority university counseling': 'ቅድሚያ የሚሰጥ የዩኒቨርሲቲ ምክር',
      'Everything in Residential': 'በመኖሪያ መንገድ ያለው ሁሉ',
      'Capstone research mentoring': 'የመጨረሻ ምርምር አማካሪነት',
      'Exam intensive workshops': 'የፈተና ጥልቅ ወርክሾፖች',
      'International applications support': 'ዓለም አቀፍ ማመልከቻ ድጋፍ',
      'Established to foster intellectual leadership in the heart of Addis Ababa, Abyssinia Academy cultivates academic distinction, ethical integrity, and civic commitment across Grades 9 through 12.': 'በአዲስ አበባ ልብ ውስጥ የአእምሮ አመራር ለማሳደግ የተቋቋመው አቢሲኒያ አካዳሚ ከክፍል 9 እስከ 12 የትምህርት ልቀት፣ ሥነ ምግባራዊ ታማኝነት እና የዜግነት ቁርጠኝነትን ያሳድጋል።',
      'Integrated national curriculum enriched with global advanced coursework and leadership.': 'በዓለም አቀፍ ከፍተኛ ኮርሶች እና አመራር የተበለጸገ የተቀናጀ ብሔራዊ ሥርዓተ ትምህርት።',
      'Academic English fluency alongside rich Amharic rhetoric and modern world languages.': 'ከባለጸጋ አማርኛ ሥነ ጽሑፍ እና ዘመናዊ የዓለም ቋንቋዎች ጋር የትምህርታዊ እንግሊዝኛ ብቃት።',
      'Natural Sciences & STEM': 'የተፈጥሮ ሳይንስ እና STEM',
      'Mathematics & Computer Studies': 'ሒሳብ እና ኮምፒውተር ጥናት',
      'Humanities, Social Sciences & Languages': 'ሰብአዊነት፣ ማህበራዊ ሳይንስ እና ቋንቋዎች',
      'Creative Arts & Music': 'ፈጠራዊ ጥበባት እና ሙዚቃ',
      'Collaborative, Inquiry-Led Classrooms': 'ትብብር እና ጥያቄ ላይ የተመሠረቱ ክፍሎች',
      'Dedicated & Mentoring Faculty': 'ቁርጠኛ እና አማካሪ መምህራን',
      'Vibrant Campus Societies & Athletics': 'እንቅስቃሴ ያላቸው የቅጥር ማህበራት እና ስፖርት',
      'University & Career Counseling': 'የዩኒቨርሲቲ እና የሙያ ምክር',
    },
    om: {
      Home: 'Mana',
      Feature: 'Amala',
      About: 'Waaʼee',
      Blogs: 'Blogoota',
      Contact: 'Nu Quunnamaa',
      Pricing: 'Gatii',
      English: 'English',
      'አማርኛ': 'አማርኛ',
      'Afaan Oromoo': 'Afaan Oromoo',
      'Addis Ababa, Ethiopia • Est. 1998': 'Finfinnee, Itoophiyaa • Bara 1998 irraa',
      'Addis Ababa • Ethiopia': 'Finfinnee • Itoophiyaa',
      'Abyssinia Academy': 'Akademii Abisiiniyaa',
      'SECONDARY SCHOOL • GRADES 9–12 • ADDIS ABABA, ETHIOPIA':
        'MANA BARUMSAA SADOOSAA • KUTAA 9–12 • FINFINNEE, ITOOPHIYAA',
      'Educating Leaders of': 'Hoogganoota barachiisaa',
      Character: 'Amala',
      ', Scholarship, and Purpose.': ', Beekumsaa, fi Kaayyoo.',
      'At Abyssinia Academy, rigorous national and international secondary curricula meet holistic mentorship on our serene highland campus in Addis Ababa.':
        'Akademii Abisiiniyaatti, barnoota sadoosaa biyyoolessaa fi idil-addunyaa cimaa, gorsa guutuu waliin kampasii keenya Finfinnee keessatti walitti dhufu.',
      'Request an Information Packet': 'Paakeetii Odeeffannoo Gaafadhu',
      'Book a Campus Visit': 'Daawwannaa Kampasii Qabadhu',
      'Grades 9–12': 'Kutaa 9–12',
      'Secondary Cycle': 'Marsaa Sadoosaa',
      'Dual Language': 'Afaan Lamaan',
      'Amharic & English Instruction': 'Barnoota Amaariffaa fi Ingiliffaa',
      'College Prep': 'Qophii Yuunivarsiitii',
      'National Curriculum & Research': 'Barnoota Biyyoolessaa & Qorannoo',
      'Co-Curricular': 'Dabalataa Barnootaa',
      'Clubs, Athletics & Societies': 'Kilaboota, Ispoortii & Waldaalee',
      'OUR COMMITMENT & VALUES': 'KUTANNOO & GATII KEENYA',
      'A tradition of academic rigor rooted in ethical responsibility and innovation.':
        'Aadaa cimaa barnootaa itti gaafatamummaa amalaa fi haaromsa irratti hundaaʼe.',
      'Holistic Education': 'Barnoota Guutuu',
      'Language Mastery': 'Dandeettii Afaanii',
      'Office of the Head of School': 'Waajjira Mataa Mana Barumsaa',
      'The Dual Pillars of Abyssinia Academy': 'Tuuta Lama Akademii Abisiiniyaa',
      'Academic Rigor & Intellectual Curiosity': 'Cimaa Barnootaa & Fedhii Sammuu',
      'Cultural Heritage & Global Citizenship': 'Dhaala Aadaa & Lammummaa Addunyaa',
      'Academic Integrity & Honor': 'Amanamummaa Barnootaa & Kabaja',
      'Student Leadership & Houses': 'Hoogganummaa Barattootaa & Manaalee',
      'Community Service & Stewardship': 'Tajaajila Hawaasaa & Kunuunsa',
      'The Academic Departments': 'Kutaa Barnootaa',
      'Four Tenets of Student Life': 'Buʼuura Afur Jireenya Barataa',
      'The Academy Bulletin': 'Beeksisa Akademii',
      'Upcoming Campus Gatherings': 'Walgaʼii Kampasii Dhufaa',
      'Begin Your Journey with Abyssinia Academy.': 'Imala Kee Akademii Abisiiniyaa Waliin Jalqabi.',
      'Request Admissions Information': 'Odeeffannoo Galmee Gaafadhu',
      'Submit Admissions Inquiry →': 'Gaaffii Galmee Ergi →',
      'Parent / Guardian Full Name *': 'Maqaa Guutuu Maatii / Kunuunsaa *',
      'Contact Email Address *': 'Teessoo Imeelii *',
      'Phone Number *': 'Lakkoofsa Bilbilaa *',
      'Prospective Student Grade *': 'Kutaa Barataa Galuu *',
      'Select Entry Grade': 'Kutaa Galuu Filadhu',
      'Grade 9 (Freshman Entry)': 'Kutaa 9 (Galmee Haaraa)',
      'Grade 10': 'Kutaa 10',
      'Grade 11 (Advanced Stream)': 'Kutaa 11 (Sarara Ol\'aanaa)',
      'Grade 12 (Transfer)': 'Kutaa 12 (Jijjiirraa)',
      'Yes, keep me informed about campus visit dates, admissions testing schedules, and school announcements. We respect your privacy. Unsubscribe anytime with one click.':
        'Eeyyee, waaʼee guyyaa daawwannaa kampasii, sagantaa qormaata galmee, fi beeksisa mana barumsaa na beeksiisaa. Dhuunfaa keenya kabajna. Yeroo kamiyyuu cuqaasuu tokkoon dhiisuu dandeessa.',
      Subscribe: 'Galmaaʼi',
      'Inquiry Confirmed': 'Gaaffiin Mirkanaaʼeera',
      Exploration: 'Qorannoo',
      Community: 'Hawaasa',
      Governance: 'Bulchiinsa',
      'The Abyssinia Bulletin': 'Beeksisa Abisiiniyaa',
      'Receive termly academic updates, student achievements, and campus event invitations.':
        'Odeeffannoo barnootaa yeroo yerootti, milkaaʼina barattootaa, fi affeerraa agarsiisa kampasii fudhadhu.',
      'Nurturing intellectual leadership, scientific curiosity, and moral integrity in secondary education across Grades 9 through 12.':
        'Kutaa 9 hanga 12tti barnoota sadoosaa keessatti hoogganummaa sammuu, fedhii saayinsii, fi amanamummaa amalaa guddifna.',
      'Get in touch': 'Nu quunnamaa',
      'Contact Us': 'Nu Quunnamaa',
      'Have questions about admissions, academics, or campus life? Send us a message and our office will get back to you shortly.':
        'Waaʼee galmee, barnoota, ykn jireenya kampasii gaaffii qabdaa? Ergaa nuuf ergi — waajjirri keenya yeroo gabaabaa keessatti siif deebisa.',
      'Contact Information': 'Odeeffannoo Quunnamtii',
      'We’d love to hear from you': 'Siirraa dhagaʼuu barbaanna',
      "We'd love to hear from you": 'Siirraa dhagaʼuu barbaanna',
      'Whether you’re curious about admissions, curriculum, campus visits, or need general information — we’re ready to answer any question.':
        'Waaʼee galmee, barnoota, daawwannaa kampasii, ykn odeeffannoo waliigalaa yoo barbaadde — gaaffii kamiyyuu deebisuu qophaaʼa.',
      "Whether you're curious about admissions, curriculum, campus visits, or need general information — we're ready to answer any question.":
        'Waaʼee galmee, barnoota, daawwannaa kampasii, ykn odeeffannoo waliigalaa yoo barbaadde — gaaffii kamiyyuu deebisuu qophaaʼa.',
      Email: 'Imeelii',
      'Admissions Office': 'Waajjira Galmee',
      'Planning a campus visit?': 'Daawwannaa kampasii karoorfatteetta?',
      'Let us walk you through our classrooms, laboratories, and campus grounds — tailored for prospective families.':
        'Kutaa barnootaa, laaboraatoorii, fi lafa kampasii siif agarsiifna — maatii galuu barbaadaniif qophaaʼe.',
      'Request Visit': 'Daawwannaa Gaafadhu',
      'Send us a message': 'Ergaa nuuf ergi',
      'Full Name': 'Maqaa Guutuu',
      'Full Name *': 'Maqaa Guutuu *',
      'Phone Number': 'Lakkoofsa Bilbilaa',
      'Your full name': 'Maqaa kee guutuu',
      Subject: 'Mata duree',
      'Subject *': 'Mata duree *',
      'Admissions, campus visit, general inquiry…': 'Galmee, daawwannaa kampasii, gaaffii waliigalaa…',
      Message: 'Ergaa',
      'Message *': 'Ergaa *',
      'How can we help you?': 'Akkamitti si gargaaruu dandeenya?',
      'Send Message': 'Ergaa Ergi',
      'Transparent Pricing': 'Gatii Ifaa',
      'Tuition & Fees': 'Kaffaltii Barnootaa & Kaffaltiiwwan',
      'Clear annual fee packages for Grades 9–12. Choose the pathway that fits your family — every plan includes core academics and pastoral care.':
        'Paakeejii kaffaltii waggaa ifaa Kutaa 9–12f. Karaa maatii keetiif mijatu filadhu — karoorri hundi barnoota buʼuuraa fi kunuunsa qaba.',
      'Day Scholar': 'Barataa Guyyaa',
      'Core Pathway': 'Karaa Buʼuuraa',
      'Full secondary instruction with weekday campus access.':
        'Barnoota sadoosaa guutuu dhaqqanamummaa kampasii guyyaa torbee waliin.',
      'ETB 85,000': 'ETB 85,000',
      ' / year': ' / waggaatti',
      '/ year': '/ waggaatti',
      Inquire: 'Gaafadhu',
      'Most Popular': 'Baayʼee Jaalatamaa',
      'Boarding Scholar': 'Barataa Manaa',
      'Residential Pathway': 'Karaa Jireenyaa',
      'Full boarding with house mentoring and evening study halls.':
        'Jireenya guutuu gorsa manaafi mana barumsaa galgalaa waliin.',
      'ETB 165,000': 'ETB 165,000',
      'Choose Plan': 'Karora Filadhu',
      'Scholars Plus': 'Scholars Plus',
      'Advanced Pathway': 'Karaa Ol\'aanaa',
      'Boarding plus research mentorship and exam intensives.':
        'Jireenya dabalataan gorsa qorannoo fi leenjii qormaataa cimaa.',
      'ETB 210,000': 'ETB 210,000',
      'Fees shown are illustrative annual packages for the 2026–2027 cycle. Laboratory, uniform, and examination fees may apply separately. Contact Admissions for a personalized quotation.':
        'Kaffaltiin agarsiifaman paakeejii waggaa fakkeenyaa marsaa 2026–2027ti. Kaffaltiin laaboraatoorii, uffataa, fi qormaataa adda taʼee kaffalamuu dandaʼa. Tilmaama dhuunfaaf Waajjira Galmee quunnamaa.',
      'Stay informed': 'Odeeffannoo fudhadhu',
      'Subscribe for fee updates, open days, and admissions deadlines.':
        'Odeeffannoo kaffaltii, guyyaa banamaa, fi daangaa galmeetiif galmaaʼi.',
      'Blogs & News': 'Blogoota & Oduu',
      'Academy Bulletin': 'Beeksisa Akademii',
      'Stories, announcements, and academic updates from Abyssinia Academy.':
        'Seenaa, beeksisa, fi odeeffannoo barnootaa Akademii Abisiiniyaa irraa.',
      'Loading posts…': 'Maxxansiwwan feʼamaa jiru…',
      'No published posts yet. Check back soon.': 'Ammatti maxxansiin hin jiru. Yeroo dhiyootti deebiʼi.',
      'Unable to load blogs right now. Start the backend API to see posts.':
        'Amma blogoota feʼuu hin dandeenye. Maxxansa ilaaluuf API duubaa jalqabi.',
      'About Abyssinia Academy': 'Waaʼee Akademii Abisiiniyaa',
      'Cultivating intellectual rigor, cultural heritage, and ethical leadership in the heart of Addis Ababa.':
        'Finfinnee keessatti cimaa sammuu, dhaala aadaa, fi hoogganummaa amalaa guddifna.',
      'Academic Excellence Through Purposeful Learning': 'Olaantummaa Barnootaa Barumsa Kaayyoo Qabuun',
      'Institutional Overview': 'Ilaalcha Dhaabbataa',
      'Our Story & Academic Heritage': 'Seenaa Keenya & Dhaala Barnootaa',
      'Our Mission & Vision': 'Ergama Keenya & Mulʼata Keenya',
      'Our Core Values': 'Gatiiwwan Buʼuuraa Keenya',
      'Leadership & Governance': 'Hoogganummaa & Bulchiinsa',
      'Our Learning Environment': 'Naannoo Barumsaa Keenya',
      'Community & Family Engagement': 'Hirmaannaa Hawaasaa & Maatii',
      'Grades 9–12 national curriculum': 'Barnoota biyyoolessaa Kutaa 9–12',
      'Dual-language Amharic & English': 'Afaan lamaan Amaariffaa & Ingiliffaa',
      'Library & science lab access': 'Kuusaa kitaabaa & laaboraatoorii saayinsii',
      'Academic advisory support': 'Deeggarsa gorsa barnootaa',
      'Everything in Core Pathway': 'Waan hunda Karaa Buʼuuraa keessa',
      'Room, meals & house tutorials': 'Kutaa, nyaata & barsiisa mana',
      'Evening supervised study': 'Barumsa galgalaa toʼatamaa',
      'Weekend activities & clubs': 'Sochii fi kilaboota dhuma torbee',
      'Priority university counseling': 'Gorsa yuunivarsiitii dursaa',
      'Everything in Residential': 'Waan hunda Karaa Jireenyaa keessa',
      'Capstone research mentoring': 'Gorsa qorannoo xumuraa',
      'Exam intensive workshops': 'Woorkishopii qormaataa cimaa',
      'International applications support': 'Deeggarsa iyyannoo idil-addunyaa',
      'Established to foster intellectual leadership in the heart of Addis Ababa, Abyssinia Academy cultivates academic distinction, ethical integrity, and civic commitment across Grades 9 through 12.': 'Finfinnee keessatti hoogganummaa sammuu guddisuuf hundeeffame, Akademiin Abisiiniyaa Kutaa 9 hanga 12tti olaantummaa barnootaa, amanamummaa amalaa, fi kutannoo lammummaa guddifa.',
      'Integrated national curriculum enriched with global advanced coursework and leadership.': "Barnoota biyyoolessaa walitti makame barnoota idil-addunyaa ol'aanaa fi hoogganummaan badhaadhe.",
      'Academic English fluency alongside rich Amharic rhetoric and modern world languages.': 'Dandeettii Ingiliffaa barnootaa waliin Amaariffaa sooressaa fi afaanota addunyaa ammayyaa.',
      'Natural Sciences & STEM': 'Saayinsii Uumamaa & STEM',
      'Mathematics & Computer Studies': 'Herrega & Qorannoo Kompiitaraa',
      'Humanities, Social Sciences & Languages': 'Namaa, Saayinsii Hawaasaa & Afaanota',
      'Creative Arts & Music': 'Aartii Uumamaa & Muuziqaa',
      'Collaborative, Inquiry-Led Classrooms': 'Kutaa Waltaʼinsaafi Gaaffiin Hogganamu',
      'Dedicated & Mentoring Faculty': 'Barsiisota Kutataa & Gorsitoota',
      'Vibrant Campus Societies & Athletics': 'Waldaalee Kampasii Sochoʼoo & Ispoortii',
      'University & Career Counseling': 'Gorsa Yuunivarsiitii & Hojii',
    },
  };

  const originalText = new WeakMap();
  const originalAttr = new WeakMap();

  function current() {
    return localStorage.getItem(KEY) || 'en';
  }

  function translateString(lang, text) {
    if (!text || lang === 'en') return null;
    const table = dict[lang] || {};
    if (table[text]) return table[text];
    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (table[collapsed]) return table[collapsed];
    return null;
  }

  function walkText(root, fn) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(fn);
  }

  function applyTextNodes(lang) {
    walkText(document.body, (node) => {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const orig = originalText.get(node);
      if (lang === 'en') {
        node.nodeValue = orig;
        return;
      }
      const trimmed = orig.replace(/\s+/g, ' ').trim();
      const lead = orig.match(/^\s*/)[0];
      const trail = orig.match(/\s*$/)[0];
      const translated = translateString(lang, trimmed);
      if (translated) node.nodeValue = lead + translated + trail;
      else node.nodeValue = orig;
    });
  }

  function applyAttributes(lang) {
    document.querySelectorAll('[placeholder], [aria-label], title').forEach((el) => {
      ['placeholder', 'aria-label', 'title'].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const mapKey = el;
        if (!originalAttr.has(mapKey)) originalAttr.set(mapKey, {});
        const bag = originalAttr.get(mapKey);
        if (bag[attr] === undefined) bag[attr] = el.getAttribute(attr);
        const orig = bag[attr];
        if (lang === 'en') {
          el.setAttribute(attr, orig);
          return;
        }
        const translated = translateString(lang, orig);
        el.setAttribute(attr, translated || orig);
      });
    });
  }

  function applyKeyed(lang) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (lang === 'en') {
        const en = el.getAttribute('data-i18n-en');
        if (en) el.textContent = en;
        return;
      }
      if (!el.getAttribute('data-i18n-en')) {
        el.setAttribute('data-i18n-en', el.textContent);
      }
      const translated = translateString(lang, key) || (dict[lang] && dict[lang][key]);
      // Prefer dictionary by English current/en attribute
      const fromEn = translateString(lang, el.getAttribute('data-i18n-en') || key);
      if (fromEn) el.textContent = fromEn;
      else if (translated) el.textContent = translated;
    });
  }

  function updateChrome(lang) {
    document.documentElement.lang = lang === 'am' ? 'am' : lang === 'om' ? 'om' : 'en';
    document.querySelectorAll('[data-lang-item]').forEach((el) => {
      const on = el.getAttribute('data-lang-item') === lang;
      el.classList.toggle('bg-surface-container', on);
      const check = el.querySelector('[data-lang-check]');
      if (check) {
        check.classList.toggle('opacity-100', on);
        check.classList.toggle('opacity-0', !on);
      }
    });
    const btn = document.getElementById('lang-current-label');
    if (btn) btn.textContent = labels[lang] || 'English';
    const titleEl = document.querySelector('title');
    if (titleEl) {
      if (!titleEl.dataset.i18nEn) titleEl.dataset.i18nEn = titleEl.textContent;
      if (lang === 'en') titleEl.textContent = titleEl.dataset.i18nEn;
      else {
        const t = translateString(lang, titleEl.dataset.i18nEn);
        if (t) titleEl.textContent = t;
      }
    }
  }

  function applyI18n(lang) {
    const code = dict[lang] ? lang : 'en';
    localStorage.setItem(KEY, code);
    updateChrome(code);
    applyKeyed(code);
    applyTextNodes(code);
    applyAttributes(code);
    document.dispatchEvent(new CustomEvent('aa:langchange', { detail: { lang: code } }));
  }

  window.applyI18n = applyI18n;
  window.getAppLang = current;
  window.t = function (text) {
    const lang = current();
    if (lang === 'en') return text;
    return translateString(lang, text) || text;
  };

  window.toggleLangMenu = function (e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.toggle('hidden');
  };

  window.selectLang = function (code, e) {
    if (e) e.stopPropagation();
    applyI18n(code);
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.add('hidden');
  };

  document.addEventListener('click', function () {
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.add('hidden');
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyI18n(current());
  });
})();
