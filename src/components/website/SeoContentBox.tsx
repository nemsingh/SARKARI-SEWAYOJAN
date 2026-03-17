import { useState } from 'react';

const contentEn = [
  { type: 'h1', text: 'Sarkari Sewayojan – Latest Government Jobs, Results & Notifications 2026' },
  { type: 'p', text: 'Sarkari Sewayojan is a trusted informational website in India where you can find the latest government jobs, admit cards, exam dates, results, answer keys, and official notifications — all in one place.\nWe publish new updates daily so that candidates receive every important piece of information on time. All information provided here is sourced from verified public sources and official websites.\nIf you are preparing for a government job in 2026, Sarkari Sewayojan is your complete information platform.' },
  { type: 'h1', text: 'Sarkari Sewayojan – Government Job Updates in One Place' },
  { type: 'p', text: 'Every year, lakhs of students and job seekers search online for government job updates. The purpose of Sarkari Sewayojan is to provide you with information about all central and state government recruitments in one place.\nHere you get:\n• Latest Government Job Notifications\n• Exam Date Updates\n• Admit Card Alerts\n• Sarkari Results\n• Merit List & Cut Off Marks\n• Answer Key & Syllabus Details\nWe ensure that no important update is missed by you.' },
  { type: 'h1', text: 'Why Choose a Government Job?' },
  { type: 'p', text: 'In India, a government job is considered a stable and secure career option. Government jobs provide candidates with long-term job security, regular salary, pension benefits, and allowances.\nSome major benefits of government jobs:\n• Job Stability\n• Fixed Working Hours\n• Pension & Retirement Benefits\n• Medical & Other Government Facilities\n• Promotion Opportunities\nIn today\'s competitive job market, the government sector is considered a safe and reliable career choice.\n\nWho Should Apply for Government Jobs?\nGovernment jobs are suitable for all candidates who:\n• Have passed 10th, 12th, or are graduates\n• Are freshers\n• Want a stable career\n• Want better security than private jobs\n• Are preparing for competitive exams\nIf you want to secure your future, a government job can be a strong option.' },
  { type: 'h1', text: 'Types of Government Jobs Available' },
  { type: 'p', text: 'In India, there are many types of career options available in the government sector. You can apply based on your qualification and interest.\n1. Administrative Services – IAS, IPS, PCS — officers play a role in policy making and governance.\n2. Banking Sector Jobs – Public sector banks offer Clerk, PO, Specialist Officer posts.\n3. Defence Services – Officer and technical positions in Army, Navy, Air Force.\n4. Police & Security Jobs – State Police, CAPF, Constable, Sub-Inspector posts.\n5. Railway Jobs – Technical and non-technical vacancies in Indian Railways.\n6. Teaching Jobs – Teacher and lecturer posts in government schools and colleges.' },
  { type: 'h1', text: 'With So Much Competition, How Can You Secure a Government Job?' },
  { type: 'p', text: 'In today\'s time, getting a government job is not easy because lakhs of candidates apply for every vacancy. But with the right strategy, proper planning, and accurate information, you can significantly increase your chances.\nIf you follow disciplined preparation and timely updates, a government job is not just a dream but can become a reality.' },
  { type: 'h1', text: 'Check Complete Job Details on Sarkari Sewayojan' },
  { type: 'p', text: 'Before applying for any government job, it is very important to understand its complete eligibility and requirements.\nOn Sarkari Sewayojan, every job post is presented in a structured format where you get:\n• Total Vacancies\n• Application Start & Last Date\n• Application Fee Details\n• Age Limit Information\n• Educational Qualification\n• Selection Process\n• Official Notification PDF\n• Online Apply Link\nThis way, you don\'t need to wander across different websites.' },
  { type: 'h1', text: 'Eligibility Criteria – What You Must Know' },
  { type: 'p', text: 'In government jobs, eligibility varies according to each post. Common requirements may include:\n• Minimum Educational Qualification (10th / 12th / Graduate / Post Graduate)\n• Age Limit (minimum and maximum age criteria)\n• Nationality Requirement\n• Experience (if required)\n• Category-wise Relaxation\nFor example, graduation may be mandatory for administrative level posts, while police or defence jobs may also include physical standards.\nTherefore, it is very important to read the notification carefully before applying.' },
  { type: 'h1', text: 'Important Dates – Never Miss a Deadline' },
  { type: 'p', text: 'In government exams, dates are the most critical factor. Missing a single date can mean losing your entire chance.\nEvery job notification generally has these dates:\n• Online Form Start Date\n• Last Date to Apply\n• Last Date for Fee Payment\n• Exam Date\n• Admit Card Release Date\n• Result Declaration Date\nOn Sarkari Sewayojan, all this information is provided in a clear format so that you don\'t miss any important update.' },
  { type: 'h1', text: 'How Competitive Is the Government Job Market?' },
  { type: 'p', text: 'The government job market is extremely competitive. In many exams, there are thousands of applicants for a single post.\nIn exams like Railway, Police, Banking, and SSC, the number of applications is very high. Due to this competition, preparation level also needs to be strong.\nIf you:\n• Follow regular updates\n• Understand the syllabus well\n• Solve previous year papers\n• Work on time management\nthen you can build a strong position in the competition.' },
  { type: 'h1', text: 'Sarkari Sewayojan Exams for Government Jobs' },
  { type: 'p', text: 'In India, government recruitments are conducted through different departments at state and central levels. The purpose of these exams is to recruit eligible candidates through a transparent selection process.\nGovernment exams generally fall into multiple categories — such as Group A, Group B, Group C, and Group D posts. For higher-level administrative posts, competitive exams and interviews are conducted, while for some posts, written exams along with skill tests or physical tests are also held.\nOn Sarkari Sewayojan, you will get the latest information about all these exams regularly.' },
  { type: 'h1', text: 'Explore More Government Exam Updates' },
  { type: 'p', text: 'From here you can directly access:\n• Latest Exam Notification Alerts\n• Important Recruitment Boards Updates\n• Online Application Forms\n• Admit Card & Result Announcements\nWe provide updates from every important recruitment authority in one place for easy access for candidates.' },
  { type: 'h1', text: 'Sarkari Sewayojan 2026 – 2027' },
  { type: 'p', text: 'Information about all major upcoming government vacancies, exam schedules, and results for 2026–2027 is regularly updated here.\nYou will get central and state government notifications in simple and easy-to-read format so you can understand every important detail.' },
  { type: 'h1', text: 'State Level Government Exam Updates' },
  { type: 'p', text: 'Every state conducts different recruitment exams at its own level. On Sarkari Sewayojan, you will get recruitment information from Uttar Pradesh, Bihar, Delhi, Madhya Pradesh, Rajasthan, Uttarakhand, and other states.\nState level exams include teacher recruitment, police recruitment, clerk posts, state PSC exams, health department jobs, and many other departments.' },
  { type: 'h1', text: 'Government Jobs – Complete Information Hub' },
  { type: 'p', text: 'Sarkari Sewayojan is an information platform where:\n• Online Application Forms\n• Official Notifications\n• Syllabus Details\n• Admit Card Updates\n• Results & Cut Off Marks\neverything is available in one place.\nWe strive to provide candidates with accurate and timely updates so they don\'t miss any vacancy details.' },
  { type: 'h1', text: 'Government Jobs & Results in Uttar Pradesh' },
  { type: 'p', text: 'Every year, many departments in Uttar Pradesh conduct recruitments — such as Police, Education Department, Health Services, PSC, High Court, Metro, Jal Nigam, and other boards.\nOn Sarkari Sewayojan, for UP candidates:\n• Latest Job Notifications\n• Exam Date Updates\n• Admit Card Information\n• Result Announcements\nare published regularly.' },
  { type: 'h1', text: 'Online Application Process for Government Jobs' },
  { type: 'p', text: 'Nowadays, most government job forms are filled online.\nThe application process generally involves these steps:\n1. Read the Official Notification carefully\n2. Complete Online Registration\n3. Upload required documents\n4. Pay Application Fee\n5. Final Submit and take printout\nCandidates are advised to carefully verify all details while filling the form.' },
  { type: 'h1', text: 'Latest Government Jobs in Bihar' },
  { type: 'p', text: 'In Bihar state too, recruitments keep happening in different departments like Police, Health, Education, Panchayati Raj, and State PSC.\nOn Sarkari Sewayojan, for Bihar candidates:\n• Recruitment Notifications\n• Exam Schedules\n• Admit Card Alerts\n• Result Updates\nare published from time to time.' },
  { type: 'h1', text: 'Government Job Updates for Delhi' },
  { type: 'p', text: 'In Delhi, both central and state type government vacancies come out regularly.\nImportant departments for Delhi candidates include:\n• Delhi Subordinate Services\n• Delhi Police\n• Delhi High Court\n• Education & Health Departments\n• Metro & Municipal Services\nOn Sarkari Sewayojan, all important Delhi-related updates are available in one place.' },
  { type: 'h1', text: 'What Can Sarkari Sewayojan Do for You?' },
  { type: 'p', text: 'In today\'s digital era, applying for government jobs has become online. From uploading documents to fee payment, everything is done through the internet. But despite the process being online, tracking deadlines, eligibility rules, and exam updates can sometimes be stressful.\nThe solution to this problem is Sarkari Sewayojan.\nWe provide you in one place:\n• Latest Government Job Notifications\n• Exam Date Updates\n• Admit Card Information\n• Sarkari Results\n• Syllabus & Selection Process Details\nin clear and easy format so you don\'t have to search multiple websites.\nIf correct and complete information is at your fingertips, both preparation and application processes become simple.' },
  { type: 'h1', text: 'Why Trust Sarkari Sewayojan for Government Job Updates?' },
  { type: 'p', text: 'The main objective of Sarkari Sewayojan is to provide candidates with fast, accurate, and organized information. We are a private informational platform that publishes updates based on public sources and official notifications.\nCandidates trust us because:\n• Information is in structured and easy-to-read format\n• Important dates are clearly mentioned\n• Official notification links are provided\n• Regular updates are published\nOur team\'s focus is to ensure every important update reaches you on time.' },
  { type: 'h1', text: 'Discover Related Government Job Categories' },
  { type: 'p', text: 'You can also explore specific information through the categories given below:\n• Government Job Openings\n• Government Recruitment 2026\n• Bihar Government Jobs\n• Uttar Pradesh Government Jobs\n• State-Level Recruitment Updates\nRelevant notifications and exam updates are regularly updated in each category.' },
  { type: 'h1', text: 'Disclaimer' },
  { type: 'p', text: 'Sarkari Sewayojan (www.sarkarisewayojan.com) is a private informational website. It has no affiliation with any government organization. The information is for general purpose. Visitors are advised to confirm from the official website before any application. We will not be responsible for any loss. Team Sarkari Sewayojan.\nThe examination results, marks, notifications, short information, and other content published on this website are provided solely for the purpose of immediate reference and information to candidates. This information should not be considered as a legal or official document. Although every reasonable effort is made to ensure that the information available on this website is accurate and up to date, Sarkari Sewayojan does not guarantee the completeness, reliability, or absolute accuracy of the content. We shall not be held responsible for any unintentional errors, omissions, or inaccuracies that may appear in the published results, marks, notifications, or other materials. Furthermore, we are not liable for any loss, damage, or inconvenience caused to any individual or entity due to any shortcomings, defects, or inaccuracies in the information provided on this website. Users are advised to verify details from the official website of the concerned department or authority before taking any action.' },
];

const contentHi = [
  { type: 'h1', text: 'सरकारी सेवायोजन – लेटेस्ट सरकारी नौकरी, रिजल्ट और नोटिफिकेशन 2026' },
  { type: 'p', text: 'सरकारी सेवायोजन भारत की एक विश्वसनीय सूचनात्मक वेबसाइट है जहां आपको लेटेस्ट सरकारी नौकरियां, एडमिट कार्ड, परीक्षा तिथियां, रिजल्ट, आंसर की और आधिकारिक नोटिफिकेशन एक ही जगह पर मिलते हैं।\nहम रोजाना नए अपडेट प्रकाशित करते हैं ताकि उम्मीदवारों को हर जरूरी जानकारी समय पर मिल सके। यहां दी गई सभी सूचना सत्यापित सार्वजनिक स्रोतों और आधिकारिक वेबसाइटों से ली जाती है।\nअगर आप 2026 में किसी सरकारी नौकरी की तैयारी कर रहे हैं, तो सरकारी सेवायोजन आपके लिए एक संपूर्ण सूचना मंच है।' },
  { type: 'h1', text: 'सरकारी सेवायोजन – सरकारी नौकरी अपडेट एक जगह' },
  { type: 'p', text: 'हर साल लाखों छात्र और नौकरी चाहने वाले सरकारी नौकरी अपडेट के लिए ऑनलाइन सर्च करते हैं। सरकारी सेवायोजन का उद्देश्य है कि आपको केंद्र और राज्य सरकार की सभी भर्तियों की जानकारी एक ही जगह पर मिले।\nयहां आपको मिलता है:\n• लेटेस्ट सरकारी नौकरी नोटिफिकेशन\n• परीक्षा तिथि अपडेट\n• एडमिट कार्ड अलर्ट\n• सरकारी रिजल्ट\n• मेरिट लिस्ट और कट ऑफ मार्क्स\n• आंसर की और सिलेबस विवरण\nहम सुनिश्चित करते हैं कि कोई भी महत्वपूर्ण अपडेट आपसे छूट न जाए।' },
  { type: 'h1', text: 'सरकारी नौकरी क्यों चुनें?' },
  { type: 'p', text: 'भारत में सरकारी नौकरी को एक स्थिर और सुरक्षित कैरियर विकल्प माना जाता है। सरकारी नौकरी उम्मीदवारों को दीर्घकालिक नौकरी सुरक्षा, नियमित वेतन, पेंशन लाभ और भत्ते प्रदान करती है।\nसरकारी नौकरी के कुछ प्रमुख लाभ:\n• नौकरी स्थिरता\n• निश्चित कार्य समय\n• पेंशन और सेवानिवृत्ति लाभ\n• चिकित्सा और अन्य सरकारी सुविधाएं\n• पदोन्नति के अवसर\nआज के प्रतिस्पर्धी नौकरी बाजार में सरकारी क्षेत्र को एक सुरक्षित और विश्वसनीय कैरियर विकल्प माना जाता है।\n\nसरकारी नौकरी के लिए कौन आवेदन करे?\nसरकारी नौकरियां उन सभी उम्मीदवारों के लिए उपयुक्त हैं जो:\n• 10वीं, 12वीं पास या ग्रेजुएट हैं\n• फ्रेशर्स हैं\n• स्थिर कैरियर चाहते हैं\n• प्राइवेट नौकरी से बेहतर सुरक्षा चाहते हैं\n• प्रतियोगी परीक्षाओं की तैयारी कर रहे हैं\nअगर आप अपने भविष्य को सुरक्षित बनाना चाहते हैं, तो सरकारी नौकरी एक मजबूत विकल्प हो सकती है।' },
  { type: 'h1', text: 'उपलब्ध सरकारी नौकरियों के प्रकार' },
  { type: 'p', text: 'भारत में सरकारी क्षेत्र में कई तरह के कैरियर विकल्प उपलब्ध हैं। आप अपनी योग्यता और रुचि के हिसाब से आवेदन कर सकते हैं।\n1. प्रशासनिक सेवाएं – IAS, IPS, PCS जैसे प्रशासनिक पद।\n2. बैंकिंग क्षेत्र की नौकरियां – सार्वजनिक क्षेत्र के बैंकों में क्लर्क, PO, स्पेशलिस्ट ऑफिसर।\n3. रक्षा सेवाएं – सेना, नौसेना, वायु सेना में अधिकारी और तकनीकी पद।\n4. पुलिस और सुरक्षा नौकरियां – राज्य पुलिस, CAPF, कांस्टेबल, सब-इंस्पेक्टर।\n5. रेलवे नौकरियां – भारतीय रेलवे में तकनीकी और गैर-तकनीकी रिक्तियां।\n6. शिक्षण नौकरियां – सरकारी स्कूलों और कॉलेजों में शिक्षक और व्याख्याता पद।' },
  { type: 'h1', text: 'इतनी प्रतिस्पर्धा में सरकारी नौकरी कैसे पाएं?' },
  { type: 'p', text: 'आज के समय में सरकारी नौकरी पाना आसान नहीं है, क्योंकि हर रिक्ति के लिए लाखों उम्मीदवार आवेदन करते हैं। लेकिन सही रणनीति, उचित योजना और सटीक जानकारी के साथ आप अपने अवसर काफी बढ़ा सकते हैं।\nअगर आप अनुशासित तैयारी और समय पर अपडेट फॉलो करते हैं, तो सरकारी नौकरी सिर्फ एक सपना नहीं, बल्कि वास्तविकता बन सकती है।' },
  { type: 'h1', text: 'सरकारी सेवायोजन पर पूरी नौकरी विवरण देखें' },
  { type: 'p', text: 'किसी भी सरकारी नौकरी के लिए आवेदन करने से पहले उसकी पूरी पात्रता और आवश्यकताओं को समझना बहुत जरूरी है।\nसरकारी सेवायोजन पर हर नौकरी पोस्ट को एक संरचित प्रारूप में दिया जाता है जिसमें आपको मिलता है:\n• कुल रिक्तियां\n• आवेदन शुरू और अंतिम तिथि\n• आवेदन शुल्क विवरण\n• आयु सीमा जानकारी\n• शैक्षिक योग्यता\n• चयन प्रक्रिया\n• आधिकारिक नोटिफिकेशन PDF\n• ऑनलाइन आवेदन लिंक\nइस तरह आपको अलग-अलग वेबसाइटों पर भटकने की जरूरत नहीं पड़ती।' },
  { type: 'h1', text: 'पात्रता मानदंड – जो आपको जानना जरूरी है' },
  { type: 'p', text: 'सरकारी नौकरियों में पात्रता हर पद के हिसाब से अलग होती है। सामान्य आवश्यकताओं में शामिल हो सकता है:\n• न्यूनतम शैक्षिक योग्यता (10वीं / 12वीं / ग्रेजुएट / पोस्ट ग्रेजुएट)\n• आयु सीमा (न्यूनतम और अधिकतम आयु मानदंड)\n• राष्ट्रीयता आवश्यकता\n• अनुभव (यदि आवश्यक हो)\n• श्रेणी-वार छूट\nउदाहरण के लिए, प्रशासनिक स्तर की पोस्ट में ग्रेजुएशन अनिवार्य हो सकता है, जबकि पुलिस या रक्षा नौकरियों में शारीरिक मानक भी शामिल होते हैं।\nइसलिए आवेदन करने से पहले नोटिफिकेशन को ध्यान से पढ़ना बहुत महत्वपूर्ण है।' },
  { type: 'h1', text: 'महत्वपूर्ण तिथियां – कोई डेडलाइन मिस न करें' },
  { type: 'p', text: 'सरकारी परीक्षाओं में तिथियां सबसे महत्वपूर्ण कारक होती हैं। एक छोटी सी तिथि मिस करने का मतलब पूरा मौका खत्म हो सकता है।\nहर नौकरी नोटिफिकेशन में आमतौर पर ये तिथियां होती हैं:\n• ऑनलाइन फॉर्म शुरू तिथि\n• आवेदन की अंतिम तिथि\n• शुल्क भुगतान की अंतिम तिथि\n• परीक्षा तिथि\n• एडमिट कार्ड जारी तिथि\n• रिजल्ट घोषणा तिथि\nसरकारी सेवायोजन पर यह सब जानकारी स्पष्ट प्रारूप में दी जाती है ताकि आप कोई भी महत्वपूर्ण अपडेट मिस न करें।' },
  { type: 'h1', text: 'सरकारी नौकरी बाजार कितना प्रतिस्पर्धी है?' },
  { type: 'p', text: 'सरकारी नौकरी बाजार बहुत ही प्रतिस्पर्धी है। कई परीक्षाओं में एक पद के लिए हजारों आवेदक होते हैं।\nरेलवे, पुलिस, बैंकिंग और SSC जैसी परीक्षाओं में आवेदनों की संख्या बहुत अधिक होती है। इसी प्रतिस्पर्धा के चलते तैयारी का स्तर भी मजबूत होना चाहिए।\nअगर आप:\n• नियमित अपडेट फॉलो करते हैं\n• सिलेबस को अच्छी तरह समझते हैं\n• पिछले वर्ष के पेपर हल करते हैं\n• समय प्रबंधन पर काम करते हैं\nतो आप प्रतिस्पर्धा में अपनी मजबूत स्थिति बना सकते हैं।' },
  { type: 'h1', text: 'सरकारी सेवायोजन – सरकारी नौकरी परीक्षाएं' },
  { type: 'p', text: 'भारत में सरकारी भर्तियां राज्य और केंद्र स्तर पर अलग-अलग विभागों के माध्यम से आयोजित की जाती हैं। इन परीक्षाओं का उद्देश्य पात्र उम्मीदवारों को पारदर्शी चयन प्रक्रिया के माध्यम से भर्ती करना होता है।\nसरकारी परीक्षाएं आमतौर पर कई श्रेणियों में होती हैं — जैसे ग्रुप A, ग्रुप B, ग्रुप C और ग्रुप D पद। उच्च स्तरीय प्रशासनिक पदों के लिए प्रतियोगी परीक्षाएं और साक्षात्कार आयोजित किए जाते हैं, जबकि कुछ पदों के लिए लिखित परीक्षा के साथ कौशल परीक्षा या शारीरिक परीक्षा भी होती है।\nसरकारी सेवायोजन पर आपको इन सभी परीक्षाओं की नवीनतम जानकारी नियमित रूप से मिलती रहेगी।' },
  { type: 'h1', text: 'और अधिक सरकारी परीक्षा अपडेट देखें' },
  { type: 'p', text: 'यहां से आप सीधे एक्सेस कर सकते हैं:\n• लेटेस्ट परीक्षा नोटिफिकेशन अलर्ट\n• महत्वपूर्ण भर्ती बोर्ड अपडेट\n• ऑनलाइन आवेदन फॉर्म\n• एडमिट कार्ड और रिजल्ट घोषणाएं\nहम हर महत्वपूर्ण भर्ती प्राधिकरण के अपडेट एक ही जगह पर प्रदान करते हैं।' },
  { type: 'h1', text: 'सरकारी सेवायोजन 2026 – 2027' },
  { type: 'p', text: '2026–2027 के लिए आने वाली सभी प्रमुख सरकारी रिक्तियों, परीक्षा कार्यक्रमों और रिजल्ट की जानकारी यहां नियमित रूप से अपडेट की जाती है।\nआपको केंद्र और राज्य सरकार की अधिसूचनाएं सरल और पढ़ने में आसान प्रारूप में मिलेंगी।' },
  { type: 'h1', text: 'राज्य स्तरीय सरकारी परीक्षा अपडेट' },
  { type: 'p', text: 'हर राज्य अपने स्तर पर अलग-अलग भर्ती परीक्षाएं आयोजित करता है। सरकारी सेवायोजन पर आपको उत्तर प्रदेश, बिहार, दिल्ली, मध्य प्रदेश, राजस्थान, उत्तराखंड और अन्य राज्यों की भर्ती सूचना मिलती रहेगी।\nराज्य स्तरीय परीक्षाओं में शिक्षक भर्ती, पुलिस भर्ती, क्लर्क पद, राज्य PSC परीक्षाएं, स्वास्थ्य विभाग की नौकरियां और कई अन्य विभाग शामिल होते हैं।' },
  { type: 'h1', text: 'सरकारी नौकरी – संपूर्ण सूचना केंद्र' },
  { type: 'p', text: 'सरकारी सेवायोजन एक सूचना मंच है जहां:\n• ऑनलाइन आवेदन फॉर्म\n• आधिकारिक अधिसूचनाएं\n• सिलेबस विवरण\n• एडमिट कार्ड अपडेट\n• रिजल्ट और कट ऑफ मार्क्स\nसब कुछ एक ही जगह पर मिलता है।\nहम उम्मीदवारों को सटीक और समय पर अपडेट प्रदान करने का प्रयास करते हैं।' },
  { type: 'h1', text: 'उत्तर प्रदेश में सरकारी नौकरी और रिजल्ट' },
  { type: 'p', text: 'उत्तर प्रदेश में हर साल कई विभागों में भर्तियां निकलती हैं — जैसे पुलिस, शिक्षा विभाग, स्वास्थ्य सेवाएं, PSC, हाई कोर्ट, मेट्रो, जल निगम और अन्य बोर्ड।\nसरकारी सेवायोजन पर UP के उम्मीदवारों के लिए:\n• लेटेस्ट नौकरी नोटिफिकेशन\n• परीक्षा तिथि अपडेट\n• एडमिट कार्ड जानकारी\n• रिजल्ट घोषणाएं\nनियमित रूप से प्रकाशित किए जाते हैं।' },
  { type: 'h1', text: 'सरकारी नौकरी के लिए ऑनलाइन आवेदन प्रक्रिया' },
  { type: 'p', text: 'आजकल अधिकतर सरकारी नौकरी के फॉर्म ऑनलाइन मोड में भरे जाते हैं।\nआवेदन प्रक्रिया में आमतौर पर ये कदम होते हैं:\n1. आधिकारिक नोटिफिकेशन को ध्यान से पढ़ें\n2. ऑनलाइन रजिस्ट्रेशन करें\n3. आवश्यक दस्तावेज अपलोड करें\n4. आवेदन शुल्क का भुगतान करें\n5. अंतिम सबमिट करके प्रिंट निकाल लें\nउम्मीदवारों को सलाह दी जाती है कि फॉर्म भरते समय सभी विवरण सावधानीपूर्वक सत्यापित करें।' },
  { type: 'h1', text: 'बिहार में लेटेस्ट सरकारी नौकरियां' },
  { type: 'p', text: 'बिहार राज्य में भी अलग-अलग विभागों जैसे पुलिस, स्वास्थ्य, शिक्षा, पंचायती राज और राज्य PSC में भर्तियां होती रहती हैं।\nसरकारी सेवायोजन पर बिहार के उम्मीदवारों के लिए:\n• भर्ती नोटिफिकेशन\n• परीक्षा कार्यक्रम\n• एडमिट कार्ड अलर्ट\n• रिजल्ट अपडेट\nसमय-समय पर प्रकाशित किए जाते हैं।' },
  { type: 'h1', text: 'दिल्ली के लिए सरकारी नौकरी अपडेट' },
  { type: 'p', text: 'दिल्ली में केंद्र और राज्य दोनों प्रकार की सरकारी रिक्तियां नियमित रूप से निकलती हैं।\nदिल्ली के उम्मीदवारों के लिए महत्वपूर्ण विभागों में शामिल हैं:\n• दिल्ली अधीनस्थ सेवाएं\n• दिल्ली पुलिस\n• दिल्ली हाई कोर्ट\n• शिक्षा और स्वास्थ्य विभाग\n• मेट्रो और नगर निगम सेवाएं\nसरकारी सेवायोजन पर दिल्ली संबंधित सभी महत्वपूर्ण अपडेट एक ही जगह पर मिलते हैं।' },
  { type: 'h1', text: 'सरकारी सेवायोजन आपके लिए क्या कर सकता है?' },
  { type: 'p', text: 'आज के डिजिटल दौर में सरकारी नौकरी के लिए आवेदन करना ऑनलाइन हो चुका है। दस्तावेज अपलोड करने से लेकर शुल्क भुगतान तक सब कुछ इंटरनेट के माध्यम से होता है। लेकिन प्रक्रिया ऑनलाइन होने के बावजूद, डेडलाइन, पात्रता नियमों और परीक्षा अपडेट को ट्रैक करना कई बार तनावपूर्ण हो सकता है।\nइसी समस्या का समाधान है सरकारी सेवायोजन।\nहम आपको एक ही जगह पर:\n• लेटेस्ट सरकारी नौकरी नोटिफिकेशन\n• परीक्षा तिथि अपडेट\n• एडमिट कार्ड जानकारी\n• सरकारी रिजल्ट\n• सिलेबस और चयन प्रक्रिया विवरण\nस्पष्ट और आसान प्रारूप में प्रदान करते हैं।\nअगर सही और पूरी जानकारी आपकी उंगलियों पर हो, तो तैयारी और आवेदन दोनों प्रक्रिया सरल हो जाती हैं।' },
  { type: 'h1', text: 'सरकारी नौकरी अपडेट के लिए सरकारी सेवायोजन पर भरोसा क्यों करें?' },
  { type: 'p', text: 'सरकारी सेवायोजन का मुख्य उद्देश्य है उम्मीदवारों को तेज, सटीक और व्यवस्थित जानकारी प्रदान करना। हम एक निजी सूचनात्मक मंच हैं जो सार्वजनिक स्रोतों और आधिकारिक अधिसूचनाओं के आधार पर अपडेट प्रकाशित करता है।\nउम्मीदवार हम पर भरोसा इसलिए करते हैं क्योंकि:\n• जानकारी संरचित और पढ़ने में आसान प्रारूप में होती है\n• महत्वपूर्ण तिथियां स्पष्ट रूप से उल्लेखित होती हैं\n• आधिकारिक नोटिफिकेशन लिंक प्रदान किए जाते हैं\n• नियमित अपडेट प्रकाशित होते हैं\nहमारी टीम का फोकस है कि आपको हर महत्वपूर्ण अपडेट समय पर मिले।' },
  { type: 'h1', text: 'संबंधित सरकारी नौकरी श्रेणियां खोजें' },
  { type: 'p', text: 'आप नीचे दी गई श्रेणियों के माध्यम से विशेष जानकारी भी खोज सकते हैं:\n• सरकारी नौकरी रिक्तियां\n• सरकारी भर्ती 2026\n• बिहार सरकारी नौकरी\n• उत्तर प्रदेश सरकारी नौकरी\n• राज्य स्तरीय भर्ती अपडेट\nहर श्रेणी में प्रासंगिक अधिसूचनाएं और परीक्षा अपडेट नियमित रूप से अपडेट किए जाते हैं।' },
  { type: 'h1', text: 'अस्वीकरण' },
  { type: 'p', text: 'सरकारी सेवायोजन (www.sarkarisewayojan.com) एक निजी सूचनात्मक वेबसाइट है। इसका किसी भी सरकारी संस्था से कोई संबंध नहीं है। जानकारी सामान्य उद्देश्य के लिए है। आगंतुकों को सलाह दी जाती है कि किसी भी आवेदन से पहले आधिकारिक वेबसाइट से पुष्टि अवश्य कर लें। हम किसी भी नुकसान के लिए जिम्मेदार नहीं होंगे। टीम सरकारी सेवायोजन।\nइस वेबसाइट पर प्रकाशित परीक्षा परिणाम, अंक, अधिसूचनाएं, संक्षिप्त जानकारी और अन्य सामग्री केवल उम्मीदवारों के तत्काल संदर्भ और जानकारी के उद्देश्य से प्रदान की जाती है। इस जानकारी को कानूनी या आधिकारिक दस्तावेज नहीं माना जाना चाहिए। यद्यपि यह सुनिश्चित करने के लिए हर उचित प्रयास किया जाता है कि इस वेबसाइट पर उपलब्ध जानकारी सटीक और अद्यतन है, सरकारी सेवायोजन सामग्री की पूर्णता, विश्वसनीयता या पूर्ण सटीकता की गारंटी नहीं देता है।' },
];

const SeoContentBox = () => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const content = lang === 'en' ? contentEn : contentHi;

  return (
    <div className="max-w-[1200px] mx-auto px-5 my-8">
      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
        {/* Language Dropdown */}
        <div className="flex justify-end py-2 px-4 bg-background border-b border-border">
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'en' | 'hi')}
            className="px-3 py-1.5 rounded-lg text-sm font-bold border border-border bg-background text-primary cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>

        {/* Content */}
        <div>
          {content.map((item, idx) =>
            item.type === 'h1' ? (
              <h2 key={idx} className="bg-primary text-primary-foreground text-lg font-bold py-3 px-5">
                {item.text}
              </h2>
            ) : (
              <div key={idx} className="bg-background text-primary py-3 px-5 text-sm leading-relaxed whitespace-pre-line">
                {item.text}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default SeoContentBox;
