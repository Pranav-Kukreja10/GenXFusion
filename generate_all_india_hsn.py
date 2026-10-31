"""
generate_all_india_hsn.py - Pan-India HSN/SAC Master Dataset Generator
Generates data/hsn_master.csv and backend/data/hsn_master.csv
with 225+ core retail/wholesale categories + all 99 official CBIC Chapter fallbacks (320+ rows total).
Strictly restricted to official GST slabs: {0.0, 3.0, 5.0, 12.0, 18.0, 28.0}.
"""

import csv
from pathlib import Path

# CBIC Statutory Schedule map
CBIC_SCHEDULES = {
    0.0: "Exempt Notification No. 2/2017-CT(Rate)",
    3.0: "Schedule IV-A (1.5% CGST + 1.5% SGST) - CBIC Notification 1/2017-CT(Rate)",
    5.0: "Schedule I (2.5% CGST + 2.5% SGST) - CBIC Notification 1/2017-CT(Rate)",
    12.0: "Schedule II (6% CGST + 6% SGST) - CBIC Notification 1/2017-CT(Rate)",
    18.0: "Schedule III (9% CGST + 9% SGST) - CBIC Notification 1/2017-CT(Rate)",
    28.0: "Schedule IV (14% CGST + 14% SGST) - CBIC Notification 1/2017-CT(Rate)",
}

ROWS = [
    # =========================================================================
    # 1. GROCERY (Food, Staples, FMCG, Beverages)
    # =========================================================================
    # 0% Loose Food Essentials
    ("1101", "GROCERY", "Wheat Flour / Loose Atta", "khulla atta loose atta gehu ka atta chakki atta pisai गेहूं आटा", 0.0, False, 0, 0.0, "KGS"),
    ("1006", "GROCERY", "Loose Rice / Chawal", "khulla chawal loose rice mota chawal broken rice kani rice चावल धान", 0.0, False, 0, 0.0, "KGS"),
    ("0713", "GROCERY", "Loose Pulses / Dal / Legumes", "khulli dal loose dal toor dal arhar moong dal chana dal urad dal masoor rajma chole kabuli chana besan दाल चना राजमा", 0.0, False, 0, 0.0, "KGS"),
    ("1103", "GROCERY", "Loose Suji / Maida / Poha", "khulla maida suji sooji rawa poha flattened rice daliya मैदा सूजी पोहा", 0.0, False, 0, 0.0, "KGS"),
    ("1008", "GROCERY", "Millets / Bajra / Jowar / Ragi (Loose)", "bajra jowar ragi kodo kutki millets mota anaj बाजरा ज्वार रागी", 0.0, False, 0, 0.0, "KGS"),
    ("0701", "GROCERY", "Fresh Vegetables / Aloo / Pyaz", "aloo potato pyaz onion tamatar tomato sabzi fresh vegetables gobi matar adrak lahsun hari mirch lemon nimbu आलू प्याज टमाटर", 0.0, False, 0, 0.0, "KGS"),
    ("0702", "GROCERY", "Fresh Tomatoes / Tamatar (Loose)", "fresh tomato tamatar desi tamatar cherry tomato टमाटर", 0.0, False, 0, 0.0, "KGS"),
    ("0703", "GROCERY", "Fresh Onions / Pyaz / Kanda (Loose)", "fresh onion pyaz kanda nasik onion लाल प्याज कांदा", 0.0, False, 0, 0.0, "KGS"),
    ("0709", "GROCERY", "Fresh Garlic & Ginger / Adrak / Lahsun", "adrak ginger lahsun garlic fresh garlic ginger paste kacha adrak लहसुन अदरक", 0.0, False, 0, 0.0, "KGS"),
    ("0401", "GROCERY", "Fresh Milk / Doodh / Curd / Paneer (Loose)", "fresh milk khulla doodh pouch milk dahi loose curd lassi chach fresh paneer cottage cheese khoya mawa दूध दही पनीर छाछ", 0.0, False, 0, 0.0, "LTR"),
    ("0407", "GROCERY", "Fresh Eggs / Anda", "fresh eggs farm eggs anda tray desi anda desi eggs मुर्गी अंडा", 0.0, False, 0, 0.0, "PCS"),
    ("1701", "GROCERY", "Loose Sugar / Gur / Jaggery", "khulli chini loose sugar chini cheeni gur jaggery bura shakkar शक्कर गुड़ चीनी", 0.0, False, 0, 0.0, "KGS"),
    ("2501", "GROCERY", "Salt / Namak (Plain / Rock)", "plain salt namak iodised salt rock salt sendha namak kala namak tata salt नमक सेंधा नमक", 0.0, False, 0, 0.0, "KGS"),
    ("0910", "GROCERY", "Khada Masala / Whole Spices (Loose)", "khada masala sabut jeera haldi sabut lal mirch dhaniya seeds saunf methi rai ajwain laung elaichi dalchini kali mirch tejpata खड़ा मसाला जीरा हल्दी", 0.0, False, 0, 0.0, "KGS"),
    ("0801", "GROCERY", "Fresh Fruits / Fal", "fresh fruits kela banana seb apple santra orange anar pomegranate aam mango amrood guava papita papaya ताजे फल सेब केला", 0.0, False, 0, 0.0, "KGS"),
    ("1905", "GROCERY", "Fresh Bread / Pav (Plain)", "plain bread pav roti bun bakery bread white bread brown bread पाव ब्रेड", 0.0, False, 0, 0.0, "PCS"),

    # 5% Branded Staples, Edible Oils, Spices, Dry Fruits, Namkeen
    ("1101", "GROCERY", "Branded Packaged Atta (Ashirvaad/Pillsbury)", "branded atta packed atta ashirvaad atta pillsbury fortune atta shakti bhog आशीर्वाद आटा", 5.0, False, 0, 0.0, "KGS"),
    ("1006", "GROCERY", "Branded Basmati Rice (India Gate/Daawat)", "branded basmati rice india gate rice daawat basmati sona masoori kohinoor rice बासमती चावल", 5.0, False, 0, 0.0, "KGS"),
    ("1514", "GROCERY", "Mustard Oil / Sarson Tel (Fortune/Dhara/P-Mark)", "mustard oil sarson tel kachi ghani fortune mustard oil dhara engine p mark bail kolhu सरसों तेल", 5.0, False, 0, 0.0, "LTR"),
    ("1512", "GROCERY", "Refined Sunflower / Soyabean / Palm Oil", "refined oil soyabean oil sunflower oil fortune refined saffola emami sunrich gemini palm oil रिफाइंड तेल", 5.0, False, 0, 0.0, "LTR"),
    ("1513", "GROCERY", "Coconut Oil / Til Oil (Edible)", "edible coconut oil parachute edible til oil sesame oil groundnut oil mungfali tel मूंगफली तेल तिल तेल", 5.0, False, 0, 0.0, "LTR"),
    ("1202", "GROCERY", "Groundnuts / Mungfali / Peanuts (Raw/Roasted)", "peanuts mungfali raw groundnut roasted peanut shengdana मूंगफली", 5.0, False, 0, 0.0, "KGS"),
    ("0804", "GROCERY", "Dates / Khajoor / Dry Coconut / Gola / Nariyal", "khajoor dates sukha nariyal dry coconut gola copra खजूर सूखा नारियल", 5.0, False, 0, 0.0, "KGS"),
    ("0902", "GROCERY", "Packaged Tea / Chai Patti (Tata/Red Label/Taj)", "tea chai patti tata tea red label taj mahal wagh bakri society tea lipton green tea चाय पत्ती", 5.0, False, 0, 0.0, "KGS"),
    ("0901", "GROCERY", "Coffee Beans & Ground Coffee (Nescafe/Bru)", "coffee instant coffee nescafe bru gold filter coffee roast coffee beans कॉफी नेस्कैफे", 5.0, False, 0, 0.0, "KGS"),
    ("0904", "GROCERY", "Black Pepper / Kali Mirch / White Pepper", "black pepper kali mirch sabut kali mirch safed mirch गोल मिर्च काली मिर्च", 5.0, False, 0, 0.0, "KGS"),
    ("0908", "GROCERY", "Nutmeg / Mace / Jaiphal / Javitri", "nutmeg jaiphal mace javitri sabut jaiphal जायफल जावित्री", 5.0, False, 0, 0.0, "KGS"),
    ("0909", "GROCERY", "Anise / Badian / Fennel / Saunf / Jeera", "saunf fennel seeds moti saunf barik saunf badian star anise सौंफ", 5.0, False, 0, 0.0, "KGS"),
    ("0910", "GROCERY", "Packaged Ground Spices / Masala (MDH/Everest/Catch)", "branded masala mdh masala everest catch haldi powder mirch powder dhaniya garam masala chaat sabzi masala chana masala धनिया हल्दी मिर्च मसाला", 5.0, False, 0, 0.0, "KGS"),
    ("0801", "GROCERY", "Dry Fruits / Kaju / Badam / Kishmish", "kaju cashew badam almond kishmish raisin pista akhrot walnut dry fruits mewa काजू बादाम किशमिश अखरोट", 5.0, False, 0, 0.0, "KGS"),
    ("1904", "GROCERY", "Fox Nuts / Makhana / Puffed Lotus Seeds", "makhana phool makhana fox nuts lotus seed roasted makhana मखाना", 5.0, False, 0, 0.0, "KGS"),
    ("2106", "GROCERY", "Namkeen / Bhujia / Farsan (Haldiram/Bikaji)", "namkeen bhujia aloo bhujia haldirams bikaji balaji moong dal sev farsan chivda नमकीन भुजिया", 5.0, False, 0, 0.0, "KGS"),
    ("2106", "GROCERY", "Indian Mithai / Sweets (Rasgulla/Gulab Jamun)", "mithai sweets gulab jamun rasgulla soan papdi barfi kaju katli haldiram sweets मिठाई रसगुल्ला", 5.0, False, 0, 0.0, "KGS"),
    ("1902", "GROCERY", "Instant Noodles / Maggi / Pasta / Macaroni", "maggi noodles instant noodles yippee top ramen knorr pasta macaroni vermicelli seviyan मैगी नूडल्स", 5.0, False, 0, 0.0, "PCS"),
    ("1901", "GROCERY", "Branded Paneer / Dahi (Packaged Amul/Mother Dairy)", "packaged paneer amul dahi mother dairy curd greek yogurt tetra milk अमूल पनीर दही", 5.0, False, 0, 0.0, "KGS"),
    ("0409", "GROCERY", "Natural Honey / Shahad (Dabur/Patanjali)", "honey shahad dabur honey patanjali honey zandu honey शहद", 5.0, False, 0, 0.0, "KGS"),
    ("1702", "GROCERY", "Glucose / Dextrose Powder (Glucon-D)", "glucon d glucose powder dabur glucose energy drink powder ग्लूकोज", 5.0, False, 0, 0.0, "KGS"),

    # 12% Desi Ghee, Butter, Cheese, Sauces, Jam, Pickles, Juices
    ("0405", "GROCERY", "Desi Ghee / Clarified Butter (Amul/Mother Dairy/Verka)", "desi ghee pure ghee amul ghee cow ghee buffalo ghee verka vita patanjali ghee ananda desi ghee देसी घी", 12.0, False, 0, 0.0, "KGS"),
    ("0405", "GROCERY", "Butter / Makhan (Amul/Nutralite)", "butter makhan amul butter salted butter unsalted butter garlic butter मक्खन अमूल बटर", 12.0, False, 0, 0.0, "KGS"),
    ("0406", "GROCERY", "Cheese / Paneer Slices (Amul/Britannia/Go)", "cheese amul cheese slices cheese cubes mozzarella pizza cheese processed cheese spread चीज़", 12.0, False, 0, 0.0, "KGS"),
    ("2001", "GROCERY", "Pickles / Achar / Murabba", "achar pickle mango achar aam ka achar mix veg pickle nimbu achar murabba amla murabba अचार मुरब्बा", 12.0, False, 0, 0.0, "KGS"),
    ("2007", "GROCERY", "Fruit Jam / Jelly (Kissan/Mapro)", "kissan jam mixed fruit jam apple jam pineapple jam fruit jelly marmalade जैम", 12.0, False, 0, 0.0, "KGS"),
    ("2103", "GROCERY", "Tomato Ketchup / Sauces / Mayonnaise (Maggi/Kissan)", "tomato ketchup tomato sauce maggi ketchup kissan sauce soya sauce chilli sauce mayonnaise mayo टोमैटो केचप सॉस", 12.0, False, 0, 0.0, "KGS"),
    ("2103", "GROCERY", "Mixed Seasonings / Pasta Sauce / Schezwan Chutney (Ching's)", "schezwan chutney chings secret pasta sauce pizza pasta sauce pizza sauce शेजवान चटनी", 12.0, False, 0, 0.0, "PCS"),
    ("2008", "GROCERY", "Canned Fruits / Sweet Corn / Canned Pineapple", "canned sweet corn sweet corn tin pineapple slice canned fruit cocktail स्वीट कॉर्न", 12.0, False, 0, 0.0, "PCS"),
    ("2009", "GROCERY", "Packaged Fruit Juice (Real/Tropicana/Maaza/Frooti)", "packaged juice real fruit juice tropicana maaza frooti slice mango drink rooh afza sharbat टेट्रा पैक जूस फ्रूटी माज़ा", 12.0, False, 0, 0.0, "LTR"),
    ("2106", "GROCERY", "Soya Chunks / Badi / Wadi (Nutrela)", "soya chunks soya badi soya bean wadi nutrela fortune soya wadi सोया बड़ी", 12.0, False, 0, 0.0, "KGS"),
    ("1904", "GROCERY", "Breakfast Cereals / Cornflakes / Oats (Kelloggs/Quaker)", "corn flakes kelloggs muesli oats quaker oats chocos breakfast cereal कॉर्नफ्लेक्स ओट्स", 12.0, False, 0, 0.0, "KGS"),

    # 18% Biscuits, Chocolates, Soaps, Detergents, Personal Care, Chips
    ("1905", "GROCERY", "Biscuits / Cookies / Rusk / Toast (Parle-G/Britannia)", "biscuits cookies parle-g marie gold good day hide and seek oreo bourbon britannia rusk toast cake बिस्कुट कुकीज़ रस्क", 18.0, False, 0, 0.0, "KGS"),
    ("1806", "GROCERY", "Chocolates / Confectionery (Cadbury/KitKat/Nestle)", "chocolate dairy milk cadbury kitkat 5 star munch perk snickers ferrero rocher toffee candy चॉकलेट टॉफी", 18.0, False, 0, 0.0, "PCS"),
    ("1704", "GROCERY", "Sugar Boiled Confectionery / Candy / Lollipops", "boiled candy lollipop pulse toffee mango bite fruit candy टॉफी लॉलीपॉप", 18.0, False, 0, 0.0, "PCS"),
    ("1905", "GROCERY", "Potato Chips / Wafers / Kurkure (Lays/Balaji/Bingo)", "chips potato chips lays kurkure bingo tedhe medhe doritos pringles wafers चिप्स कुरकुरे", 18.0, False, 0, 0.0, "PCS"),
    ("2104", "GROCERY", "Soups / Broths / Soup Powder (Knorr/Maggi)", "soup knorr soup tomato soup sweet corn soup soup mix सूप", 18.0, False, 0, 0.0, "PCS"),
    ("1901", "GROCERY", "Malted Food Drinks / Health Drinks (Horlicks/Bournvita/Boost)", "horlicks bournvita boost complan malt drink chocolate drink हॉर्लिक्स बॉर्नविटा", 18.0, False, 0, 0.0, "KGS"),
    ("3401", "GROCERY", "Bath Soap / Body Wash (Dettol/Lifebuoy/Lux/Dove)", "bath soap bathing soap dettol lifebuoy lux dove santoor pears cinthol medimix body wash साबुन डेटॉल लक्स", 18.0, False, 0, 0.0, "PCS"),
    ("3402", "GROCERY", "Detergent Powder / Cake / Liquid (Surf Excel/Ariel/Tide/Ghadi)", "detergent powder washing powder surf excel ariel tide ghadi detergent wheel rin bar vim bar dishwash liquid डिटर्जेंट पाउडर घड़ी व्हील", 18.0, False, 0, 0.0, "KGS"),
    ("3306", "GROCERY", "Toothpaste / Toothbrush (Colgate/Closeup/Dant Kanti)", "toothpaste colgate closeup sensodyne babool patanjali dant kanti oral-b toothbrush meswak टूथपेस्ट ब्रश", 18.0, False, 0, 0.0, "PCS"),
    ("3305", "GROCERY", "Shampoo / Conditioner (Clinic Plus/Sunsilk/Head&Shoulders)", "shampoo clinic plus sunsilk head shoulders dove pantene conditioner hair serum शैम्पू कंडीशनर", 18.0, False, 0, 0.0, "PCS"),
    ("3305", "GROCERY", "Hair Oil (Parachute/Bajaj Almond/Dabur Amla)", "hair oil parachute coconut oil bajaj almond drops dabur amla navratna cool oil kesh king चमेली तेल नारियल तेल", 18.0, False, 0, 0.0, "LTR"),
    ("3304", "GROCERY", "Skin Cream / Face Wash / Talcum Powder (Fair&Lovely/Ponds/Nivea)", "skin cream cold cream face wash fair lovely glow lovely ponds nivea vaseline body lotion talcum powder फेस वॉश क्रीम", 18.0, False, 0, 0.0, "PCS"),
    ("3307", "GROCERY", "Deodorant / Perfume / Shaving Cream (Fogg/Axe/Gillette)", "deodorant deo perfume fogg axe wild stone engage gillette shaving cream razor blades शेविंग क्रीम परफ्यूम", 18.0, False, 0, 0.0, "PCS"),
    ("2201", "GROCERY", "Packaged Drinking Water (Bisleri/Kinley/Aquafina)", "packaged drinking water mineral water bisleri kinley aquafina bailley water bottle 1 litre bottle 20 litre jar मिनरल वाटर बिसलेरी", 18.0, False, 0, 0.0, "LTR"),
    ("3808", "GROCERY", "Insecticides / Mosquito Repellent (All Out/Good Knight/Hit)", "mosquito repellent all out good knight refill coil hit spray baygon kala hit red hit machar agarbatti मच्छर अगरबत्ती ऑल आउट", 18.0, False, 0, 0.0, "PCS"),
    ("4818", "GROCERY", "Toilet Paper / Tissue Paper / Kitchen Towels", "toilet paper tissue paper napkins facial tissue kitchen roll tissues टॉवल टिशू", 18.0, False, 0, 0.0, "PCS"),
    ("3405", "GROCERY", "Shoe Polish / Floor Polish / Metal Polish (Cherry Blossom)", "shoe polish cherry blossom kiwi shoe polish liquid polish brasso colin glass cleaner शूज पॉलिश कोलिन", 18.0, False, 0, 0.0, "PCS"),

    # 28% Cold Drinks, Aerated Beverages, Energy Drinks
    ("2202", "GROCERY", "Aerated Soft Drinks / Cold Drinks (Coca Cola/Pepsi/Thums Up/Sprite)", "cold drinks soft drinks aerated water coca cola thums up pepsi sprite fanta mirinda 7up mountain dew limca 2 litre bottle can कोल्ड ड्रिंक्स थम्स अप पेप्सी", 28.0, False, 0, 0.0, "LTR"),
    ("2202", "GROCERY", "Energy Drinks / Caffeinated (Red Bull/Monster/Sting)", "energy drink red bull monster sting energy hell drink caffeinated beverage रेड बुल स्टिंग", 28.0, False, 0, 0.0, "PCS"),
    ("2403", "GROCERY", "Pan Masala / Gutkha (Strict 28% GST)", "pan masala gutkha rajnigandha vimal pan masala kamla pasand शिखर विमल पान मसाला", 28.0, False, 0, 0.0, "PCS"),

    # =========================================================================
    # 2. RESTAURANT_FOOD (Food Services, Dhaba, Restaurant, Fast Food)
    # =========================================================================
    ("9963", "RESTAURANT_FOOD", "Restaurant / Dhaba Dining & Takeaway (Non-AC/AC)", "restaurant service dhaba dining food bill restaurant bill takeaway dining thali lunch dinner meal होटल खाना ढाबा", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Fast Food / Pizza / Burger / Sandwich (Domino's/McD/Subway)", "pizza margherita burger french fries sandwich wrap garlic bread pasta momos roll roll takeaway पिज्जा बर्गर सैंडविच", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Indian Curry / Dal Makhani / Paneer Dish / Naan", "dal makhani shahi paneer butter paneer kadai paneer butter chicken roti naan tandoori roti paratha kulcha दाल मखनी शाही पनीर नान", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Biryani / Fried Rice / Pulao / Thali", "biryani chicken biryani veg biryani mutton biryani fried rice veg pulao special thali thali meal बिरयानी पुलाव थाली", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Street Food / Samosa / Kachori / Chole Bhature / Dosa", "samosa kachori chole bhature pav bhaji idli dosa sambar vada chaat tikki dahi bhalla समोसा कचौड़ी छोले भटूरे डोसा", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Tea Stall / Coffee Shop / Shake (Tapri/Cafe)", "chai hot tea kulhad chai cutting chai espresso coffee cold coffee lassi shake milkshake चाय कॉफी लस्सी शेक", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Desserts / Ice Cream / Gulab Jamun / Kulfi / Waffle", "ice cream vanilla chocolate cone sundae kulfi falooda waffle gulab jamun rasmalai brownie पेस्ट्री आइसक्रीम", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Chinese Food / Noodles / Manchurian / Spring Roll", "hakka noodles chowmein veg manchurian chilli paneer chilli chicken spring roll fried rice चाउमीन मंचूरियन", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Tandoori Snacks / Paneer Tikka / Chaap / Kebab", "tandoori chicken paneer tikka soya chaap malai chaap seekh kebab afghani chaap तंदूरी टिक्का चाप", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Dosa / Masala Dosa / Idli Sambar / Vada", "masala dosa plain dosa idli sambar medu vada uttapam onion rava dosa दक्षिण भारतीय डोसा इडली", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "South Indian Meals / Rice Thali / Curd Rice", "south indian meals thali curd rice lemon rice rasam rice सांबर राइस", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Momos / Dim Sum (Veg / Paneer / Chicken)", "steamed momos fried momos veg momos tandoori momos chicken momos मोमोज़", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Rolls / Wraps / Kathi Roll (Paneer / Egg / Chicken)", "kathi roll paneer roll veg roll egg roll chicken roll wrap रोल काठी रोल", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Indian Breads / Roti / Paratha / Naan / Bhatura", "tandoori roti butter naan lachha paratha aloo paratha bhatura plain naan तंदूरी रोटी पराठा", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Beverages / Mocktail / Lemonade / Cold Drink (Restaurant Serve)", "fresh lime soda mint mojito cold drink ice tea cold beverage छाछ नीम्बू पानी", 5.0, False, 0, 0.0, "PCS"),

    # =========================================================================
    # 3. TEXTILES & APPAREL
    # =========================================================================
    # 5% Unstitched Fabrics / Sarees / Dhotis / Thaan
    ("5208", "TEXTILES", "Unstitched Cotton Fabric / Kapda Thaan", "cotton fabric kapda thaan unstitched fabric cotton poplin cambric voil latha astar kapda lining fabric सूती कपड़ा थान अस्तर", 5.0, False, 0, 0.0, "MTR"),
    ("5407", "TEXTILES", "Synthetic / Polyester / Rayon Fabric", "polyester fabric rayon crepe georgette chiffon satin synthetic fabric फॉल कपड़ा रेयान", 5.0, False, 0, 0.0, "MTR"),
    ("5007", "TEXTILES", "Pure Silk / Resham Fabric / Banarasi Silk", "silk fabric pure silk banarasi katan silk tussar muga resham kapda रेशम कपड़ा", 5.0, False, 0, 0.0, "MTR"),
    ("5208", "TEXTILES", "Cotton Saree / Dhoti / Lungi", "cotton saree printed saree dhoti lungi mundu gamchha cotton odhani सूती साड़ी धोती लुंगी", 5.0, False, 0, 0.0, "PCS"),
    ("5407", "TEXTILES", "Synthetic Saree / Georgette / Chiffon Saree", "synthetic saree georgette saree chiffon saree daily wear saree साड़ी", 5.0, False, 0, 0.0, "PCS"),
    ("5209", "TEXTILES", "Denim Fabric / Jeans Cloth", "denim fabric jeans cloth heavy cotton twill denim thaan डेनिम कपड़ा", 5.0, False, 0, 0.0, "MTR"),
    ("5806", "TEXTILES", "Narrow Woven Fabrics / Ribbons / Laces / Niwar", "narrow fabric niwar ribbon lace border gota patti fall border गोटा लेस", 5.0, False, 0, 0.0, "MTR"),
    ("5513", "TEXTILES", "Polyester Cotton Blended Fabric / PC Cloth", "pc fabric poly cotton uniform cloth shirting suiting कपड़ा", 5.0, False, 0, 0.0, "MTR"),

    # Conditional Garments: <= 1000 -> 5%, > 1000 -> 12%
    ("6109", "TEXTILES", "T-Shirts / Polo / Hosiery Garments (<=₹1000: 5%, >₹1000: 12%)", "tshirt polo tee round neck printed tshirt cotton banyan innerwear vest brief underwear टी शर्ट बनियान", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6203", "TEXTILES", "Men Shirts / Trousers / Jeans / Kurta (<=₹1000: 5%, >₹1000: 12%)", "mens shirt formal shirt cotton trousers denim jeans pants kurta pyjama pathani blazer men wear शर्ट पैंट कुर्ता जींस", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6204", "TEXTILES", "Women Suits / Salwar Kameez / Lehnga / Kurti (<=₹1000: 5%, >₹1000: 12%)", "women suit salwar suit salwar kameez kurti cotton kurti dailywear kurti ladies kurti cotton dailywear kurti readymade lehnga lehenga bridal dress frock gown लेहंगा सलवार सूट कुर्ती", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6111", "TEXTILES", "Kids Wear / Baby Garments / Frocks (<=₹1000: 5%, >₹1000: 12%)", "kids wear baby clothes baba suit frock romper children clothing kids shorts बच्चों के कपड़े", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6302", "TEXTILES", "Bed Sheets / Towels / Curtains / Blankets (<=₹1000: 5%, >₹1000: 12%)", "bedsheet chadar pillow cover bath towel gamcha curtains parda blanket kambal razai quik cover चादर तौलिया पर्दा कंबल", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6115", "TEXTILES", "Socks / Stockings / Gloves (Hosiery)", "socks moja jurab stockings woollen gloves hosiery socks मोज़े", 5.0, True, 1000.0, 12.0, "PAR"),
    ("6101", "TEXTILES", "Winter Jackets / Overcoats / Sweaters / Mufflers (<=₹1000: 5%, >₹1000: 12%)", "winter jacket sweater cardigan muffler woolen shawl lohi overcoat स्वेटर जैकेट शॉल", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6211", "TEXTILES", "Tracksuits / Sportswear / Gym Wear (<=₹1000: 5%, >₹1000: 12%)", "tracksuit track pant gym wear shorts sportswear sports t-shirt ट्रैकसूट लोअर", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6214", "TEXTILES", "Dupatta / Chunni / Stole / Scarf (<=₹1000: 5%, >₹1000: 12%)", "dupatta chunni stole cotton scarf chiffon dupatta banarasi stole दुपट्टा चुन्नी", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6304", "TEXTILES", "Sofa Covers / Cushion Covers / Table Cloth", "sofa cover cushion cover pillow cushion table cover runner sofa fabric सोफा कवर कुशन", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6301", "TEXTILES", "Woollen Blankets / Quilt / Razai / Dohar", "woollen blanket mink blanket single bed blanket double bed razai dohar quilt रजाई कम्बल दोहर", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6212", "TEXTILES", "Brassieres / Girdles / Corsets / Innerwear", "bra brassiere lingerie innerwear cotton slips shapewear लेडीज इनरवियर", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6205", "TEXTILES", "Men Formal Shirts / Cotton Khadi Shirt", "mens formal shirt khadi shirt cotton linen shirt button shirt कमीज शर्ट", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6206", "TEXTILES", "Women Blouses / Tops / Shirts", "ladies blouse stitched blouse crop top tunics printed tops ब्लाउज टॉप", 5.0, True, 1000.0, 12.0, "PCS"),

    # =========================================================================
    # 4. HARDWARE, CEMENT & BUILDING MATERIALS
    # =========================================================================
    # 28% Strictly Cement Keywords ONLY
    ("2523", "HARDWARE", "Portland Cement / OPC / PPC / White Cement (Strict 28%)", "cement opc cement ppc cement jk cement ultratech acc ambuja birla shree cement bangur cement white cement concrete सीमेंट पोर्टलैंड अल्ट्राटेक", 28.0, False, 0, 0.0, "BAG"),

    # 18% Tiles, Sanitaryware, Timber, Sariya, Paints, Pipes, Furniture
    ("6907", "HARDWARE", "Ceramic / Vitrified Floor & Wall Tiles (Kajaria/Somany)", "tiles floor tiles wall tiles ceramic tiles vitrified tiles glazed tiles bathroom tiles kajaria somany spenza टाइल्स फर्श टाइल", 18.0, False, 0, 0.0, "SQF"),
    ("6802", "HARDWARE", "Marble / Granite / Kota Stone Slabs", "granite slab marble makrana marble kota stone green marble kitchen counter slab मार्बल ग्रेनाइट कोटा स्टोन", 18.0, False, 0, 0.0, "SQF"),
    ("4407", "HARDWARE", "Timber / Wooden Planks / Lakkad / Saagwan", "timber wood wooden planks sagon teak wood pinewood deodar lakkad lakdi balli chaukhat लकड़ी बल्ली तख्ता", 18.0, False, 0, 0.0, "CFT"),
    ("4412", "HARDWARE", "Plywood / Blockboard / Flush Door (Greenply/Century)", "plywood ply board commercial ply marine ply block board flush door shuttering ply प्लाईवुड बोर्ड", 18.0, False, 0, 0.0, "SQF"),
    ("9403", "HARDWARE", "Furniture / Almirah / Bed / Sofa / Table / Chair", "wooden furniture almirah metal almirah bed double bed sofa set dining table plastic chair nilkamal office table फर्नीचर अलमारी पलंग", 18.0, False, 0, 0.0, "PCS"),
    ("7214", "HARDWARE", "TMT Steel Bars / Sariya / Iron Rods (Tata Tiscon/Jindal/Kamdhenu)", "tmt sariya iron sariya tata tiscon jindal steel kamdhenu 10mm 12mm 16mm sariya binding wire लोहे का सरिया सरिया", 18.0, False, 0, 0.0, "KGS"),
    ("7216", "HARDWARE", "Iron Angles / Channels / Beams / Flat / Square Bar", "iron angle ms channel ms beam iron flat square bar girder gater patti एंगल चैनल गाटर", 18.0, False, 0, 0.0, "KGS"),
    ("7306", "HARDWARE", "GI Pipes / Hollow Section Steel Tubes (Tata/Apollo)", "gi pipe ms pipe square pipe apollo hollow section pipe galvanised pipe जीआई पाइप", 18.0, False, 0, 0.0, "MTR"),
    ("3208", "HARDWARE", "Paint / Emulsion / Enamel / Primer (Asian Paints/Berger)", "asian paints berger nerolac dulux tractor emulsion enamel paint oil paint exterior paint primer distemper पेंट इनेमल प्राइमर", 18.0, False, 0, 0.0, "LTR"),
    ("3214", "HARDWARE", "Wall Putty / White Cement Putty (Birla White/JK WallMaxx)", "wall putty birla white putty jk wallmaxx putty acrylic putty waterproofing putty पुट्टी वॉल पुट्टी", 18.0, False, 0, 0.0, "KGS"),
    ("3917", "HARDWARE", "PVC Pipes / CPVC / UPVC / Conduit Pipes (Astral/Supreme)", "pvc pipe cpvc pipe upvc pipe supreme astral finolex prince pipe plumbing pipe conduit pipe drainage pipe पीवीसी पाइप नल", 18.0, False, 0, 0.0, "MTR"),
    ("3925", "HARDWARE", "Plastic Water Storage Tank / Sintex Tank", "water tank sintex tank 500 litre 1000 litre water storage tank syntax water tank पानी की टंकी सिंटेक्स", 18.0, False, 0, 0.0, "PCS"),
    ("6910", "HARDWARE", "Sanitaryware / Wash Basin / Toilet Commode (Cera/Hindware/Parryware)", "sanitaryware wash basin toilet commode western toilet seat indian seat urinal cera hindware parryware सेनेटरी वॉश बेसिन कमोड", 18.0, False, 0, 0.0, "PCS"),
    ("8481", "HARDWARE", "Plumbing Taps / Valves / Faucets / Cocks (Jaguar/Cera)", "taps water tap bib cock pillar cock angle valve mixer shower jaguar cera brass tap नल टूटी वाल्व", 18.0, False, 0, 0.0, "PCS"),
    ("7318", "HARDWARE", "Nuts / Bolts / Screws / Fasteners / Nails (Keel)", "screws drywall screws nut bolt washer keel nails iron nails self drilling anchor fastener पेच नट बोल्ट कील", 18.0, False, 0, 0.0, "KGS"),
    ("8301", "HARDWARE", "Padlocks / Door Locks / Handles / Hinges (Godrej/Link/Harrison)", "padlock godrej lock link lock door lock mortise lock kabja hinges door handles tower bolt ताला कब्जा सिटकनी", 18.0, False, 0, 0.0, "PCS"),
    ("3506", "HARDWARE", "Adhesive / Fevicol / Araldite / Tile Chemical", "fevicol sh adhesive araldite fevikwik tile adhesive tile chemical silicone sealant फेविकोल चिपकाने वाला", 18.0, False, 0, 0.0, "KGS"),
    ("7314", "HARDWARE", "Wire Mesh / Jali / Mosquito Net / Chain Link", "wire mesh jali iron mesh stainless steel jali mosquito net window jali जाली तार जाली", 18.0, False, 0, 0.0, "SQF"),
    ("8302", "HARDWARE", "Door Closer / Drawer Channel / Telescopic Slides", "door closer hydraulic door closer drawer channel telescopic channel ebco godrej डोर क्लोजर चैनल", 18.0, False, 0, 0.0, "PCS"),
    ("7324", "HARDWARE", "Stainless Steel Kitchen Sink (Nirali/Hindware)", "kitchen sink stainless steel sink single bowl sink double bowl sink सिंक किचन सिंक", 18.0, False, 0, 0.0, "PCS"),
    ("6806", "HARDWARE", "Rockwool / Glass Wool / Thermal Insulation Material", "thermal insulation glass wool rockwool acoustic foam glasswool इन्सुलेशन", 18.0, False, 0, 0.0, "SQF"),
    ("7610", "HARDWARE", "Aluminium Window Frames / Sliding Section / Doors", "aluminium window aluminium sliding section partition door frame दरवाजा खिड़की", 18.0, False, 0, 0.0, "SQF"),
    ("8307", "HARDWARE", "Flexible Tubing / Metallic Conduit / Braided Hose", "flexible hose braided pipe connection pipe flexible metallic pipe होज पाइप", 18.0, False, 0, 0.0, "PCS"),
    ("7317", "HARDWARE", "Wire Nails / Concrete Steel Nails / Panel Pins", "concrete nails steel nails wire nails gajendra keel panel pins कांक्रीट कील", 18.0, False, 0, 0.0, "KGS"),

    # 5% Aggregates, Sand, Bricks
    ("2505", "HARDWARE", "Natural Sand / Reti / Badarpur / River Sand", "sand reti balu badarpur river sand m-sand coarse sand रेत बालू बदरपुर", 5.0, False, 0, 0.0, "CFT"),
    ("2517", "HARDWARE", "Stone Aggregate / Bajri / Gitti / Gravel", "bajri gitti aggregate stone crushed stone roddi ballast बजरी गिट्टी", 5.0, False, 0, 0.0, "CFT"),
    ("6901", "HARDWARE", "Red Clay Bricks / Flyash Bricks / AAC Blocks", "red bricks clay bricks itta eent flyash bricks aac blocks cement block ईंट भट्ठा ईंट", 5.0, False, 0, 0.0, "PCS"),

    # =========================================================================
    # 5. ELECTRONICS & ELECTRICALS
    # =========================================================================
    # 12% LED Bulbs, Solar
    ("8539", "ELECTRONICS", "LED Lamps & Electric Bulbs / Tubelights", "led bulb 9w led 12w 15w led tube light batten philips havells syska crompton wipro bulb zero watt led lamp एलईडी बल्ब ट्यूबलाइट", 18.0, False, 0, 0.0, "PCS"),
    ("8541", "ELECTRONICS", "Solar Panels / Solar Inverter Systems", "solar panel solar cell solar inverter rooftop solar loom solar luman solar panel सोलर पैनल", 12.0, False, 0, 0.0, "PCS"),
    ("3926", "ELECTRONICS", "Mobile Back Covers / Screen Protectors / Guards", "mobile cover phone back cover tempered glass screen guard gorilla glass मोबाइल कवर ग्लास", 12.0, False, 0, 0.0, "PCS"),

    # 18% Fans, Coolers, Wires, Small Appliances, Mobiles, Computers, CCTV
    ("8414", "ELECTRONICS", "Ceiling Fans / Exhaust Fans / Air Coolers (Crompton/Usha/Bajaj)", "ceiling fan table fan exhaust fan pedestal fan air cooler desert cooler crompton usha orient bajaj पंखा कूलर", 18.0, False, 0, 0.0, "PCS"),
    ("8544", "ELECTRONICS", "Electrical Wires / Cables (Havells/Polycab/Finolex)", "electrical wire copper wire cable polycab havells finolex rr kabel 1.5 sq mm 2.5 sq mm wiring बिजली तार केबल", 18.0, False, 0, 0.0, "MTR"),
    ("8536", "ELECTRONICS", "Switches / Sockets / MCB / Modular Plates (Anchor/Havells/Legrand)", "switch socket modular switch mcb distribution box anchor roma havells legrand switch board स्विच सॉकेट एमसीबी", 18.0, False, 0, 0.0, "PCS"),
    ("8517", "ELECTRONICS", "Mobile Phones / Smartphones (Samsung/Redmi/Realme/Apple)", "smartphone mobile phone cell phone samsung redmi realme apple iphone oppo vivo oneplus narzo मोबाइल फोन", 18.0, False, 0, 0.0, "PCS"),
    ("8504", "ELECTRONICS", "Mobile Chargers / USB Cables / Power Banks", "mobile charger fast charger type c cable usb cable data cable power bank adapter चार्जर केबल पावर बैंक", 18.0, False, 0, 0.0, "PCS"),
    ("8518", "ELECTRONICS", "Earphones / Headphones / Bluetooth Speakers (boAt/Noise/JBL)", "earphones headphones earbuds tws bluetooth neckband boat noise jbl speaker bluetooth soundbar इयरफोन हेडफोन", 18.0, False, 0, 0.0, "PCS"),
    ("8471", "ELECTRONICS", "Laptops / Computers / Desktops (HP/Dell/Lenovo)", "laptop computer desktop pc lenovo hp dell macbook keyboard mouse cpu monitor ssd hard disk लैपटॉप कंप्यूटर", 18.0, False, 0, 0.0, "PCS"),
    ("8443", "ELECTRONICS", "Printers / All-in-One Multifunction / Toner (HP/Canon/Epson)", "printer laser printer inkjet printer hp printer canon epson cartidge toner ink bottle प्रिंटर टोनर", 18.0, False, 0, 0.0, "PCS"),
    ("8525", "ELECTRONICS", "CCTV Cameras / Security Systems / DVR (CP Plus/Hikvision)", "cctv camera security camera dvr nvr cp plus hikvision dome camera bullet camera वाईफाई कैमरा", 18.0, False, 0, 0.0, "PCS"),
    ("8516", "ELECTRONICS", "Mixer Grinder / Electric Iron / Geyser / Kettle (Bajaj/Philips)", "mixer grinder juicer mixie iron press dry iron electric kettle water heater geyser बजाज मिक्सी प्रेस गीजर", 18.0, False, 0, 0.0, "PCS"),
    ("8421", "ELECTRONICS", "Water Purifier / RO System / Filters (Kent/Aquaguard/Pureit)", "water purifier ro system kent ro aquaguard pureit ro filter candle uv filter पानी फिल्टर", 18.0, False, 0, 0.0, "PCS"),
    ("8504", "ELECTRONICS", "Inverter / Home UPS / Stabilizer (Luminous/Microtek/V-Guard)", "home inverter ups voltage stabilizer v guard microtek luminous 1000va इन्वर्टर स्टेबलाइजर", 18.0, False, 0, 0.0, "PCS"),
    ("8516", "ELECTRONICS", "Induction Cooktop / Microwave Oven / OTG (Prestige/Bajaj)", "induction cooktop induction stove microwave oven otg prestige philips इंडक्शन चूल्हा", 18.0, False, 0, 0.0, "PCS"),
    ("8516", "ELECTRONICS", "Immersion Water Heater Rod / Room Heater (Bajaj/Usha)", "immersion rod water rod room heater halogen heater fan heater ब्लोअर हीटर रॉड", 18.0, False, 0, 0.0, "PCS"),
    ("8516", "ELECTRONICS", "Hair Dryer / Hair Straightener / Trimmer (Philips/Nova)", "hair dryer hair straightener trimmer shaver beard trimmer हेयर ड्रायर ट्रिमर", 18.0, False, 0, 0.0, "PCS"),
    ("8509", "ELECTRONICS", "Vacuum Cleaner / Floor Polisher (Eureka Forbes/Philips)", "vacuum cleaner eureka forbes wet dry vacuum floor cleaner वैक्यूम क्लीनर", 18.0, False, 0, 0.0, "PCS"),
    ("8523", "ELECTRONICS", "USB Pen Drive / SD Memory Card / External SSD (SanDisk)", "pen drive usb drive memory card micro sd sandisk external hard disk पेन ड्राइव मेमोरी कार्ड", 18.0, False, 0, 0.0, "PCS"),
    ("8531", "ELECTRONICS", "Electric Calling Bell / Door Bell / Buzzer (Anchor/Cona)", "door bell calling bell ding dong bell musical bell electric buzzer कॉलिंग बेल", 18.0, False, 0, 0.0, "PCS"),
    ("8537", "ELECTRONICS", "Automatic Changeover Switch / Generator Switch", "changeover switch automatic changeover generator selector panel चेंजओवर स्विच", 18.0, False, 0, 0.0, "PCS"),

    # 28% AC, Fridge, Washing Machine, Large TV >32", Batteries
    ("8415", "ELECTRONICS", "Air Conditioners / Inverter Split AC (Voltas/LG/Daikin)", "air conditioner split ac window ac 1.5 ton ac 1 ton inverter ac voltas lg daikin panasonic blue star एसी एयर कंडीशनर", 28.0, False, 0, 0.0, "PCS"),
    ("8418", "ELECTRONICS", "Refrigerators / Single & Double Door Fridge (LG/Samsung/Whirlpool)", "refrigerator fridge single door double door lg samsung whirlpool godrej deep freezer फ्रिज रेफ्रिजरेटर", 28.0, False, 0, 0.0, "PCS"),
    ("8450", "ELECTRONICS", "Washing Machines / Front & Top Load (LG/Samsung/IFB)", "washing machine automatic washing machine semi automatic front load top load lg samsung ifb वाशिंग मशीन", 28.0, False, 0, 0.0, "PCS"),
    ("8528", "ELECTRONICS", "LED Smart TVs (> 32 inch) / 4K Ultra HD (Sony/LG/Samsung)", "led tv smart tv 43 inch tv 55 inch tv 65 inch android tv sony bravia lg samsung mi tv स्मार्ट टीवी", 28.0, False, 0, 0.0, "PCS"),
    ("8507", "ELECTRONICS", "Lead Acid Inverter Batteries / Car Batteries (Exide/Luminous/Amaron)", "inverter battery car battery exide luminous amaron tubular battery 150ah 200ah इन्वर्टर बैटरी", 28.0, False, 0, 0.0, "PCS"),

    # =========================================================================
    # 6. MEDICAL & PHARMACEUTICALS
    # =========================================================================
    # 0% Contraceptives, Blood
    ("4014", "MEDICAL", "Contraceptives / Condoms / Nirodh", "condom nirodh moodes durex kamaraj contraceptives निरोध गर्भनिरोधक", 0.0, False, 0, 0.0, "PCS"),
    ("3002", "MEDICAL", "Human Blood / Plasma / Vaccines", "human blood plasma tetanus vaccine anti rabies vaccine polio vaccine ब्लड वैक्सीन टीका", 0.0, False, 0, 0.0, "PCS"),

    # 5% Life-Saving Drugs, Insulin, Oral Rehydration Salts (ORS)
    ("3004", "MEDICAL", "Insulin Injections & Formulations", "insulin injection lantus novomix humalog diabetes injection इन्सुलिन", 5.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "ORS / Oral Rehydration Salts (Electral/Enerzal)", "ors electral powder enerzal rehydration sachet ओआरएस इलेक्ट्रल", 5.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Critical Life Saving Formulations (Hepatitis/Cancer)", "life saving oncology anti viral remdesivir sofosbuvir cancer drug जीवन रक्षक दवा", 5.0, False, 0, 0.0, "PCS"),

    # 12% Common Allopathic & Ayurvedic Medicines, Bandages, Diapers
    ("3004", "MEDICAL", "Allopathic Tablets / Capsules / Syrups (Paracetamol/Antibiotics)", "paracetamol dolo calpol azithromycin amoxicillin pan d omeprazole cough syrup pain killer antibiotic tablet दवाई कैप्सूल सिरप", 12.0, False, 0, 0.0, "STRP"),
    ("3004", "MEDICAL", "Ayurvedic & Homeopathic Formulations (Chyawanprash/Liv52/Zandu)", "chyawanprash dabur liv52 himalaya zandu balm patanjali ayurvedic tonic ashwagandha त्रिफला च्यवनप्राश", 12.0, False, 0, 0.0, "PCS"),
    ("3005", "MEDICAL", "Cotton Bandages / Dressing Gauze / Adhesive Plaster (Hansaplast)", "band aid bandage gauze cotton roll hansaplast antiseptic dressing crepe bandage पट्टी बैंडेज रुई", 12.0, False, 0, 0.0, "PCS"),
    ("9018", "MEDICAL", "Disposable Syringes / Needles / IV Cannula / Infusion Sets", "disposable syringe needle iv cannula drip set dispovan injection syringe सिरिंज सुई ड्रिप", 12.0, False, 0, 0.0, "PCS"),
    ("9619", "MEDICAL", "Sanitary Napkins / Pads / Adult & Baby Diapers (Whisper/Stayfree/Pampers)", "sanitary pads sanitary napkins whisper stayfree sofy baby diapers pampers huggies adult diapers पैड डायपर", 12.0, False, 0, 0.0, "PCS"),
    ("9004", "MEDICAL", "Corrective Spectacles / Eyeglasses / Frames / Lenses", "spectacles eyeglasses corrective lenses optical frame reading glasses चश्मा नजर का चश्मा", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Pain Relief Ointment / Gel / Spray (Moov/Volini/Iodex)", "moov volini fastum iodex omnigel pain spray pain balm दर्दनिवारक बाम", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Eye Drops / Ear Drops / Nasal Spray (Ciplox/Otrivin)", "ciplox eye drops otrivin nasal spray refresh tears ear drops आई ड्रॉप", 12.0, False, 0, 0.0, "PCS"),
    ("9021", "MEDICAL", "Orthopaedic Appliances / Fracture Splints / Knee Braces", "knee brace cervical collar lumbar support belt fracture splint crutches ऑर्थोपेडिक बेल्ट", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Antiseptic Liquid / Cream (Dettol/Savlon/Betadine)", "dettol liquid savlon liquid betadine ointment burnol antiseptic cream एंटीसेप्टिक लिक्विड", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Cough Lozenges / Strepsils / Vicks Vaporub", "strepsils vicks vapo rub cough lozenges vicks inhaler विक्स वेपोरब", 12.0, False, 0, 0.0, "PCS"),
    ("9018", "MEDICAL", "Surgical Gloves / Latex Examination Gloves", "surgical gloves latex gloves examination gloves nitrile gloves सर्जिकल दस्ताने", 12.0, False, 0, 0.0, "BOX"),

    # 18% Medical Equipment, Supplements, Sanitizers
    ("9025", "MEDICAL", "Clinical Thermometer / Digital BP Monitor (Omron/Dr Morepen)", "thermometer digital thermometer omron bp monitor blood pressure monitor pulse oximeter थर्मामीटर बीपी मशीन", 18.0, False, 0, 0.0, "PCS"),
    ("9027", "MEDICAL", "Blood Glucose Monitor / Glucometer Strips (Accu-Chek/OneTouch)", "glucometer sugar check machine accu chek onetouch blood test strips ग्लूकोमीटर स्ट्रिप्स", 18.0, False, 0, 0.0, "PCS"),
    ("2106", "MEDICAL", "Health Supplements / Protein Powder / Multivitamins (Revital/Horlicks)", "protein powder whey protein revital multivitamin zincovit b-complex calcium vitamin d3 सप्लीमेंट प्रोटीन", 18.0, False, 0, 0.0, "PCS"),
    ("3808", "MEDICAL", "Hand Sanitizer / Disinfectant Liquid (Dettol/Savlon/Lifebuoy)", "hand sanitizer 70 alcohol sanitizer savlon dettol surface disinfectant सैनिटाइजर", 18.0, False, 0, 0.0, "LTR"),
    ("9019", "MEDICAL", "Nebulizer Machine / Vaporizer / Steamer", "nebulizer machine steam inhaler facial steamer omron nebulizer नेबुलाइजर", 18.0, False, 0, 0.0, "PCS"),

    # =========================================================================
    # 7. FOOTWEAR, UTENSILS & AUTOMOTIVE
    # =========================================================================
    # Footwear (Conditional: <= 1000 -> 12%, > 1000 -> 18%)
    ("6402", "FOOTWEAR_UTENSILS_AUTO", "Rubber / Synthetic Slippers / Chappal / Sandals (<=₹1000: 12%, >₹1000: 18%)", "chappal hawai chappal paragon relaxo sparx flite slippers flip flops sandals crocs चप्पल सैंडल स्लीपर", 12.0, True, 1000.0, 18.0, "PAR"),
    ("6403", "FOOTWEAR_UTENSILS_AUTO", "Leather Shoes / Sports Shoes / Boots / Formal Shoes (<=₹1000: 12%, >₹1000: 18%)", "leather shoes sports shoes running shoes sneakers formal shoes school shoes woodland bata red tape puma जूते स्पोर्ट्स शूज़", 12.0, True, 1000.0, 18.0, "PAR"),
    ("6404", "FOOTWEAR_UTENSILS_AUTO", "Canvas Shoes / Canvas Sneakers / PT Shoes (<=₹1000: 12%, >₹1000: 18%)", "canvas shoes pt shoes white canvas school shoes goldstar sneakers कैनवास जूते", 12.0, True, 1000.0, 18.0, "PAR"),

    # Utensils & Kitchenware
    ("7323", "FOOTWEAR_UTENSILS_AUTO", "Stainless Steel Utensils / Thali / Katori / Bartan", "steel bartan steel thali katori glass donga patila cooker stainless steel bartan स्टील बर्तन थाली पतीला", 12.0, False, 0, 0.0, "KGS"),
    ("7615", "FOOTWEAR_UTENSILS_AUTO", "Aluminium Cookware / Pressure Cooker (Hawkins/Prestige)", "pressure cooker hawkins prestige aluminium kadai frying pan tawa cooker fry pan कुकर कढ़ाई तवा", 12.0, False, 0, 0.0, "PCS"),
    ("7418", "FOOTWEAR_UTENSILS_AUTO", "Brass & Copper Utensils / Puja Bartan / Lota", "brass utensils copper bottle tamba lota pooja thali brass diya gangajali तांबा पीतल लोटा", 12.0, False, 0, 0.0, "PCS"),
    ("7321", "FOOTWEAR_UTENSILS_AUTO", "LPG Gas Stove / Chulha / Burner (Prestige/Sunflame)", "lpg gas stove 2 burner gas stove 3 burner sunflame prestige gas chulha burner गैस चूल्हा स्टोव", 18.0, False, 0, 0.0, "PCS"),
    ("9617", "FOOTWEAR_UTENSILS_AUTO", "Vacuum Flask / Thermosteel Water Bottle (Milton)", "vacuum flask milton thermosteel hot cold water bottle insulated jug thermo flask मिल्टन फ्लास्क बोतल", 18.0, False, 0, 0.0, "PCS"),
    ("3924", "FOOTWEAR_UTENSILS_AUTO", "Household Plasticware / Bucket / Mug / Basin (Cello/Nayasa)", "plastic bucket balti plastic mug tub dustbin storage container cello nayasa प्लास्टिक बाल्टी मग", 18.0, False, 0, 0.0, "PCS"),
    ("4202", "FOOTWEAR_UTENSILS_AUTO", "School Bags / Backpacks / Suitcase / Trolley (Skybags/American Tourister)", "school bag backpack luggage suitcase trolley bag travel bag skybags safari american tourister बैग सूटकेस ट्रॉली", 18.0, False, 0, 0.0, "PCS"),
    ("4203", "FOOTWEAR_UTENSILS_AUTO", "Leather Belts / Leather Wallets / Purses", "leather belt men purse wallet leather wallet gents belt ladies purse लेदर बेल्ट बटुआ", 18.0, False, 0, 0.0, "PCS"),
    ("7323", "FOOTWEAR_UTENSILS_AUTO", "Steel Tiffin Box / Lunch Box / Dabba", "tiffin box steel tiffin lunch box dabba multi tier tiffin टिफिन डिब्बा", 12.0, False, 0, 0.0, "PCS"),

    # Automotive & Lubricants
    ("2710", "FOOTWEAR_UTENSILS_AUTO", "Engine Oil / Motor Oil / Mobil (Castrol/Motul/Servo)", "engine oil motor oil 4t 20w40 10w30 castrol active motul servo gulf mobil 1 gear oil ब्रेक आयल मोबिल आयल इंजन तेल", 18.0, False, 0, 0.0, "LTR"),
    ("4011", "FOOTWEAR_UTENSILS_AUTO", "Motorcycle / Car / Tractor Tyres (MRF/Apollo/CEAT) (Strict 28%)", "tyre tube mrf tyre apollo ceat jk tyre bike tyre car tyre tractor tyre tubeless tyre टायर ट्यूब", 28.0, False, 0, 0.0, "PCS"),
    ("8708", "FOOTWEAR_UTENSILS_AUTO", "Automobile Spare Parts / Brake Pads / Clutch / Filter (Strict 28%)", "bike spare parts car spare parts brake pad clutch plate chain sprocket horn shocker filter ऑटो पार्ट्स ब्रेक पैड", 28.0, False, 0, 0.0, "PCS"),
    ("8711", "FOOTWEAR_UTENSILS_AUTO", "Motorcycles / Scooters / Two-Wheelers (Strict 28%)", "motorcycle bike scooter scooty hero honda activa pulsar splendor बाइक स्कूटर", 28.0, False, 0, 0.0, "PCS"),
    ("6506", "FOOTWEAR_UTENSILS_AUTO", "Motorcycle Helmets / Safety Helmets (Vega/Studds/Steelbird)", "helmet vega helmet studds steelbird motorcycle helmet isi helmet हेलमेट", 18.0, False, 0, 0.0, "PCS"),
    ("8512", "FOOTWEAR_UTENSILS_AUTO", "Vehicle Horn / Bulb / Headlight / Indicator", "bike horn car horn headlight bulb indicator bulb led headlight हॉर्न बल्ब", 28.0, False, 0, 0.0, "PCS"),
    ("8421", "FOOTWEAR_UTENSILS_AUTO", "Automobile Oil Filter / Air Filter / Fuel Filter", "oil filter air filter fuel filter diesel filter car filter बाइक कार फिल्टर", 28.0, False, 0, 0.0, "PCS"),
    ("8714", "FOOTWEAR_UTENSILS_AUTO", "Bicycle / Cycle Parts & Accessories (Hero/Atlas)", "bicycle cycle cycle tyre tube paddle chain hero cycle साइकिल", 12.0, False, 0, 0.0, "PCS"),

    # =========================================================================
    # 8. STATIONERY, JEWELLERY, AGRI & SERVICES
    # =========================================================================
    # 0% Printed Books, Agriculture Hand Tools
    ("4901", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Printed Books / School Textbooks / Religious Books", "school books ncert textbooks college books story books gita ramayan quran printed literature किताबें पुस्तकें", 0.0, False, 0, 0.0, "PCS"),
    ("1209", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Agricultural Seeds / Beej (Hybrid/Certified)", "agri seeds beej hybrid seeds wheat seed paddy seed vegetable seed sarson beej बीज", 0.0, False, 0, 0.0, "KGS"),
    ("2309", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Cattle Feed / Pashu Aahar / Khal / Churi", "cattle feed pashu aahar khali sarson khal binola khal churi kapila pashu aahar पशु आहार खल", 0.0, False, 0, 0.0, "KGS"),
    ("8201", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Agricultural Hand Tools / Khurpi / Kassi / Daranti", "agri hand tools khurpi kassi phawra spade sickle daranti belcha trowel खुरपी कुदाल फावड़ा", 0.0, False, 0, 0.0, "PCS"),

    # 3% Gold, Silver, Precious Jewellery
    ("7113", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Gold Jewellery / Sona Gehna (Hallmark 22K/18K)", "gold jewellery gold ring necklace chain bangles earrings hallmark gold sona kangan सोने के गहने अंगूठी", 3.0, False, 0, 0.0, "GMS"),
    ("7113", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Silver Jewellery / Chandi / Payal / Bichhiya", "silver jewellery chandi payal bichhiya silver coin chandi thali bartan चांदी के जेवर पायल", 3.0, False, 0, 0.0, "GMS"),

    # 5% Fertilizers, Transport Freight
    ("3102", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Urea / Chemical Fertilizers (IFFCO/KRIBHCO)", "urea fertilizer neem coated urea dap npk potash iffco खाद यूरिया डीएपी", 5.0, False, 0, 0.0, "BAG"),
    ("9965", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Goods Transport Agency / Freight / Bhada / Kiraya", "freight gta goods transport carriage loading unloding bhada kiraya pavti ट्रांसपोर्ट भाड़ा", 5.0, False, 0, 0.0, "PCS"),
    ("9988", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Job Work / Tailoring Services / Silai", "tailoring silai stitching charges tailoring work job work cutting stitching सिलाई सिलाई मजदूरी", 5.0, False, 0, 0.0, "PCS"),

    # 12% Exercise Notebooks, Cartons
    ("4820", "STATIONERY_JEWELLERY_AGRI_SERVICES", "School Exercise Notebooks / Registers / Copy / Diary", "school notebook register spiral notebook copy diary practical notebook classmate register कॉपियां रजिस्टर डायरी", 12.0, False, 0, 0.0, "PCS"),
    ("9609", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Pencils / Crayons / Eraser / Sharpener (Apsara/Nataraj)", "pencils lead pencil apsara nataraj crayons eraser rubber sharpener scale geometric box पेंसिल रबर कटर", 12.0, False, 0, 0.0, "PCS"),
    ("4819", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Corrugated Cartons / Packing Boxes / Gatta Peti", "corrugated box cartons packing box gatta peti carton box dabba कार्टन डिब्बा", 12.0, False, 0, 0.0, "PCS"),
    ("4821", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Paper Labels / Price Tags / Barcode Stickers", "paper labels barcode sticker price tag printed label स्टिकर लेबल", 12.0, False, 0, 0.0, "PCS"),

    # 18% Ballpoint Pens, Office Paper, Pesticides
    ("9608", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Ballpoint Pens / Gel Pens / Markers (Reynolds/Cello)", "ball pen gel pen ballpoint pen cello butterflow reynolds pilot pen marker highlighter पेन बॉल पेन", 18.0, False, 0, 0.0, "PCS"),
    ("4802", "STATIONERY_JEWELLERY_AGRI_SERVICES", "A4 Copier Paper / Photocopy Paper (JK/Bilt/TNPL)", "a4 paper xerox paper photocopy paper jk copier bilt ream 75gsm 80gsm पेपर रिम", 18.0, False, 0, 0.0, "RIM"),
    ("8305", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Stapler / Pins / Paper Clips / Tape / Calculator", "stapler stapler pin paper clip cello tape brown tape binder clip calculator scissor पंच मशीन स्टेपलर", 18.0, False, 0, 0.0, "PCS"),
    ("3808", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Agricultural Pesticides / Keetnashak (Syngenta/Bayer)", "pesticides insecticide fungicide weedicide keetnashak dhar keeda dawa syngenta bayer upl कीटनाशक दवा", 18.0, False, 0, 0.0, "LTR"),
    ("9987", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Equipment Repair / Maintenance Services (Labour / Mistri Charges)", "repair charges maintenance service labour charges mistri charges ac servicing mechanic charges रिपेयरिंग मिस्त्री चार्ज", 18.0, False, 0, 0.0, "PCS"),
    ("3926", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Office File Folders / Document Bags / Plastic Files", "file folder document file certificate folder ring binder report file फाइल फोल्डर", 18.0, False, 0, 0.0, "PCS"),
    ("3215", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Printing Ink / Stamp Pad Ink / Marker Ink (Kores)", "stamp pad ink kores stamp pad printing ink marker refill स्याही स्टाम्प पैड", 18.0, False, 0, 0.0, "PCS"),
    ("4817", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Paper Envelopes / Postal Covers / Khaki Lifafa", "paper envelope postal cover khaki lifafa document cover लिफाफा", 18.0, False, 0, 0.0, "PCS"),
    ("9612", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Typewriter Ribbon / Printer Ribbon / Inked Ribbon", "printer ribbon typewriter ribbon passbook ribbon रिबन", 18.0, False, 0, 0.0, "PCS"),
    ("3506", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Glue Stick / Gum Bottle / Craft Adhesive (Fevistick)", "fevistick glue stick paper gum office paste गोंद फेविस्टिक", 18.0, False, 0, 0.0, "PCS"),

    # --- Enriched High-Frequency Retail Categories ---
    ("0713", "GROCERY", "Branded Packaged Pulses / Dal (Tata Sampann)", "branded dal tata sampann toor dal arhar dal moong dal chana dal urad dal masoor dal rajma chole दाल अरहर मूंग", 5.0, False, 0, 0.0, "KGS"),
    ("1904", "GROCERY", "Puffed Rice / Murmura / Lai / Bhel", "murmura puffed rice lai murmure bhel mamra लाई मुरमुरा", 0.0, False, 0, 0.0, "KGS"),
    ("1704", "GROCERY", "Mukhwas / Mouth Freshener / Saunf Supari", "mouth freshener mukhwas saunf supari meetha paan pass pass chandrika मुखवास", 18.0, False, 0, 0.0, "PCS"),
    ("2103", "GROCERY", "Chinese Sauces / Soy Sauce / Chilli Sauce (Ching's Secret)", "soy sauce red chilli sauce green chilli sauce chings secret vinegar sirka डार्क सोया सॉस", 12.0, False, 0, 0.0, "PCS"),
    ("2103", "GROCERY", "Mayonnaise & Sandwich Spreads (Veeba/FunFoods)", "mayonnaise veg mayo sandwich spread cheese spread veeba funfoods मेयोनीज", 12.0, False, 0, 0.0, "PCS"),
    ("1904", "GROCERY", "Oats / Rolled Oats / Masala Oats (Saffola/Quaker)", "oats rolled oats saffola masala oats quaker oats healthy oats ओट्स", 18.0, False, 0, 0.0, "KGS"),
    ("1806", "GROCERY", "Premium Chocolates / Cocoa Gift Packs (Ferrero/Amul)", "dark chocolate amul dark chocolate ferrero rocher lindt silk roast almond चॉकलेट गिफ्ट", 18.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Pizza & Italian Food (Margherita/Farmhouse/Pasta)", "pizza margherita farmhouse pizza cheese burst garlic bread pasta red sauce white sauce पिज्जा पास्ता", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Burgers & French Fries (Crispy Veg/Chicken Whopper)", "burger veg burger crispy burger chicken burger french fries peri peri fries बर्गर फ्राइज", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Sandwiches & Grilled Toasts (Veg Club/Cheese Grill)", "sandwich grilled sandwich veg club sandwich cheese toast paneer sandwich सैंडविच", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "South Indian Dosa / Idli Sambhar / Medu Vada", "masala dosa plain dosa idli sambhar medu vada onion uttapam rava dosa डोसा इडली सांभर", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Momos & Dimsums (Steamed/Fried/Tandoori)", "momos veg momos paneer momos steamed momos fried momos tandoori momos dimsum मोमोज", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Indian Curries / Dal Makhani / Paneer Butter Masala", "dal makhani paneer butter masala shahi paneer kadai paneer dal fry mix veg दाल मखनी पनीर", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Tandoori Roti / Butter Naan / Laccha Paratha", "tandoori roti butter naan garlic naan plain naan laccha paratha missi roti रोटी नान पराठा", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Biryani & Pulao (Hyderabadi Veg/Dum Biryani)", "biryani veg biryani dum biryani hyderabadi biryani jeera rice veg pulao बिरयानी पुलाव", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Street Snacks / Samosa / Kachori / Chole Bhature / Chaat", "samosa kachori bread pakora chole bhature pav bhaji aloo tikki chaat गोलगप्पा समोसा", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Beverages / Masala Chai / Filter Coffee / Lassi / Shakes", "masala chai adrak chai kulhad chai filter coffee cold coffee lassi mango shake चाय लस्सी कॉफी", 5.0, False, 0, 0.0, "PCS"),
    ("1905", "RESTAURANT_FOOD", "Bakery Cakes / Pastries / Brownies / Muffins (18% GST)", "chocolate cake black forest red velvet pastry brownie muffin croissant donut केक पेस्ट्री", 18.0, False, 0, 0.0, "PCS"),
    ("2105", "RESTAURANT_FOOD", "Ice Cream / Kulfi / Sundae (Amul/Kwality Walls/Vadilal)", "ice cream vanilla butterscotch chocobar kulfi matka kulfi cornetto sundae आइसक्रीम कुल्फी", 18.0, False, 0, 0.0, "PCS"),
    ("6205", "TEXTILES", "Men Casual & Formal Shirts (Arrow/Peter England) (<=₹1000: 5%, >₹1000: 12%)", "mens shirt formal shirt casual shirt cotton shirt printed shirt arrow peter england शर्ट फॉर्मल शर्ट", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6203", "TEXTILES", "Men Denim Jeans / Trousers (Levi's/Spykar) (<=₹1000: 5%, >₹1000: 12%)", "mens jeans denim jeans levis spykar wrangler cotton trousers chinos pants जींस पैंट", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6110", "TEXTILES", "Woolen Sweaters / Cardigans / Hoodies (<=₹1000: 5%, >₹1000: 12%)", "sweater woolen sweater cardigan pullover hoodie sweatshirt monte carlo स्वेटर हुडी", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6103", "TEXTILES", "Track Pants / Joggers / Gym Shorts (<=₹1000: 5%, >₹1000: 12%)", "track pants joggers gym shorts pyjama lower sports lower ट्रैक पैंट लोअर", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6209", "TEXTILES", "Kids & Baby Garments / Frocks / Baba Suits (<=₹1000: 5%, >₹1000: 12%)", "kids wear baby clothes baba suit frock romper baby set बच्चों के कपड़े फ्रॉक", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6302", "TEXTILES", "Bedsheets & Pillow Covers (Bombay Dyeing) (<=₹1000: 5%, >₹1000: 12%)", "bedsheet double bedsheet single bedsheet pillow covers bedcover bombay dyeing चादर बेडशीट", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6301", "TEXTILES", "Blankets / Quilts / Kambal / Razai / Dohar (<=₹1000: 5%, >₹1000: 12%)", "blanket kambal mink blanket razai quilt dohar woolen blanket कंबल रजाई", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6302", "TEXTILES", "Bath Towels / Hand Towels / Gamchha (<=₹1000: 5%, >₹1000: 12%)", "bath towel hand towel cotton towel gamchha roomal तौलिया गमछा", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6802", "HARDWARE", "Granite Slabs / Polished Granite (Black Galaxy)", "granite slab polished granite black galaxy tan brown granite flooring ग्रेनाइट पत्थर", 18.0, False, 0, 0.0, "SQF"),
    ("7005", "HARDWARE", "Float Glass / Toughened Glass Sheets (Modiguard/Saint Gobain)", "float glass toughened glass window glass mirror sheet saint gobain modiguard कांच ग्लास शीट", 18.0, False, 0, 0.0, "SQF"),
    ("7610", "HARDWARE", "Aluminium Window & Door Profiles (Jindal)", "aluminium section sliding window profile door frame jindal aluminium एल्युमिनियम सेक्शन", 18.0, False, 0, 0.0, "KGS"),
    ("3506", "HARDWARE", "CPVC & UPVC Solvent Cement / Pipe Glue (Astral/Supreme)", "solvent cement cpvc solvent upvc glue pipe adhesive astral supreme fevitite सॉल्वेंट सीमेंट", 18.0, False, 0, 0.0, "PCS"),
    ("2505", "HARDWARE", "Natural Sand / River Sand / Reti / Badarpur", "sand river sand reti badarpur morrum construction sand रेत बजरी बदरपुर", 5.0, False, 0, 0.0, "CFT"),
    ("6901", "HARDWARE", "Clay Bricks / Fly Ash Bricks / Int (Red Brick)", "clay bricks red brick bhatta int fly ash bricks construction bricks ईंट भट्ठा ईंट", 5.0, False, 0, 0.0, "PCS"),
    ("3925", "HARDWARE", "Plastic Water Storage Tank (Sintex/Plasto)", "water tank plastic tank 500 ltr 1000 ltr sintex plasto sintex tank पानी की टंकी", 18.0, False, 0, 0.0, "PCS"),
    ("8541", "ELECTRONICS", "Solar PV Panels / Solar Modules (Tata/Luminous/Adani)", "solar panel solar module solar pv tata solar luminous solar 330w 540w सोलर पैनल", 12.0, False, 0, 0.0, "PCS"),
    ("3926", "ELECTRONICS", "Mobile Phone Back Covers / Cases / Tempered Glass", "mobile back cover phone case tempered glass screen protector silicon case मोबाइल कवर ग्लास", 18.0, False, 0, 0.0, "PCS"),
    ("8517", "ELECTRONICS", "Smartwatches & Fitness Bands (Noise/boAt/Fire-Boltt)", "smartwatch fitness band noise boat fire boltt apple watch calling watch स्मार्टवॉच", 18.0, False, 0, 0.0, "PCS"),
    ("8517", "ELECTRONICS", "Wi-Fi Routers & Modems (TP-Link/D-Link/Netgear)", "wifi router wireless router adsl modem d link tp link netgear 300mbps dual band वाईफाई राउटर", 18.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Antacid Tablets & Chewable / Sachet (Digene/Gelusil/Eno)", "digene gelusil eno sachet antacid gas tablet acidity relief ईनो डाइजीन", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Antihistamine & Allergy Tablets (Cetirizine/Allegra/Montair LC)", "cetirizine allegra montair lc levocetirizine avil allergy tablet सर्दी जुकाम दवा", 12.0, False, 0, 0.0, "STRP"),
    ("3004", "MEDICAL", "Hypertension & Blood Pressure Medicines (Telma/Amlodipine)", "telma 40 amlodipine atenolol losartan bp tablet hypertension blood pressure दवा", 12.0, False, 0, 0.0, "STRP"),
    ("3004", "MEDICAL", "Diabetes Formulations (Glycomet/Metformin/Glimepiride)", "glycomet metformin glimepiride januvia sugar tablet diabetes medicine शुगर दवा", 12.0, False, 0, 0.0, "STRP"),
    ("3004", "MEDICAL", "Calcium & Vitamin D3 Tablets (Shelcal/Calcidol)", "shelcal 500 calcium tablet vitamin d3 osteo calcium chewable calcium कैल्शियम गोली", 12.0, False, 0, 0.0, "STRP"),
]

# =============================================================================
# Add All 99 CBIC Statutory Chapters (01 to 99) as Generic Fallbacks
# =============================================================================
CHAPTER_FALLBACKS = [
    ("77", "GENERAL", "Harmonized System Reserved Chapter 77", "reserved chapter 77 general merchandise", 18.0),

    ("01", "GROCERY", "Live Animals", "live animals cattle sheep goats poultry", 0.0),
    ("02", "GROCERY", "Meat and Edible Meat Offal", "meat poultry chicken mutton edible meat offal", 0.0),
    ("03", "GROCERY", "Fish, Crustaceans & Aquatic Invertebrates", "fish prawn shrimp crab aquatic animals fresh fish", 0.0),
    ("04", "GROCERY", "Dairy Produce, Eggs, Natural Honey", "dairy milk cheese curd egg honey dairy products", 5.0),
    ("05", "GROCERY", "Products of Animal Origin", "animal origin bones horns feathers animal products", 5.0),
    ("06", "GROCERY", "Live Trees, Plants, Cut Flowers", "live trees plants bulbs roots cut flowers bouquets", 0.0),
    ("07", "GROCERY", "Edible Vegetables, Roots & Tubers", "vegetables sabzi potato onion roots tubers", 0.0),
    ("08", "GROCERY", "Edible Fruit & Nuts, Citrus Fruit Peels", "fruit nuts dry fruits citrus fruits fal mewa", 5.0),
    ("09", "GROCERY", "Coffee, Tea, Mate and Spices", "coffee tea chai spices masala herbs condiments", 5.0),
    ("10", "GROCERY", "Cereals (Wheat, Rice, Maize, Corn)", "cereals wheat rice chawal gehu maize grain", 0.0),
    ("11", "GROCERY", "Milling Industry Products, Malt, Starches", "milling flour atta maida suji starch malt", 5.0),
    ("12", "GROCERY", "Oil Seeds, Misc Grains, Seeds & Fruit", "oil seeds mustard seed groundnut beej medicinal plants", 5.0),
    ("13", "GROCERY", "Lac, Gums, Resins & Other Veg Saps", "lac natural gum resin vegetable saps extracts", 18.0),
    ("14", "GROCERY", "Vegetable Plaiting Materials & Veg Products", "bamboo cane vegetable plaiting materials broom", 5.0),
    ("15", "GROCERY", "Animal or Vegetable Fats, Oils & Waxes", "vegetable oil edible oil cooking oil fat wax tel", 5.0),
    ("16", "GROCERY", "Meat, Fish, Crustaceans Preparations", "canned meat sausages preserved fish processed meat", 12.0),
    ("17", "GROCERY", "Sugars and Sugar Confectionery", "sugar chini jaggery confectionery candy molasses", 5.0),
    ("18", "GROCERY", "Cocoa and Cocoa Preparations", "cocoa chocolate cocoa butter cocoa powder", 18.0),
    ("19", "GROCERY", "Preparations of Cereals, Flour, Starch, Pastry", "biscuits bakery pasta noodles cornflakes bread", 18.0),
    ("20", "GROCERY", "Preparations of Vegetables, Fruit, Nuts", "jam jelly pickle ketchup fruit juice preserved veg", 12.0),
    ("21", "GROCERY", "Miscellaneous Edible Preparations", "sauce namkeen instant food yeast soup mix curry", 18.0),
    ("22", "GROCERY", "Beverages, Spirits and Vinegar", "cold drinks water soft drinks energy drink juice vinegar", 28.0),
    ("23", "GROCERY", "Residues & Waste from Food Industries, Animal Feed", "cattle feed animal fodder bran khal oil cake", 5.0),
    ("24", "GROCERY", "Tobacco and Manufactured Tobacco Substitutes", "tobacco pan masala gutkha bidi cigarettes", 28.0),
    ("25", "HARDWARE", "Salt, Sulphur, Earths, Stone, Lime & Cement", "salt sulphur cement limestone marble granite stone sand", 18.0),
    ("26", "HARDWARE", "Ores, Slag and Ash", "iron ore copper ore mineral slag ash", 18.0),
    ("27", "FOOTWEAR_UTENSILS_AUTO", "Mineral Fuels, Mineral Oils, Bitumen, Waxes", "engine oil lubricant motor oil petrol diesel coal wax", 18.0),
    ("28", "GENERAL", "Inorganic Chemicals, Compounds of Precious Metals", "inorganic chemicals acids chlorine soda peroxide", 18.0),
    ("29", "GENERAL", "Organic Chemicals", "organic chemicals hydrocarbons solvents alcohols", 18.0),
    ("30", "MEDICAL", "Pharmaceutical Products", "medicines tablets pharma injections drugs bandages", 12.0),
    ("31", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Fertilizers", "fertilizer urea dap npk potash chemical fertilizer", 5.0),
    ("32", "HARDWARE", "Tanning or Dyeing Extracts, Paints, Varnishes, Putty", "paint varnish dyes pigments putty distemper primer", 18.0),
    ("33", "GROCERY", "Essential Oils, Perfumery, Cosmetics, Toilet Preparations", "perfume soap cream cosmetic oil shampoo deodorant", 18.0),
    ("34", "GROCERY", "Soap, Organic Surface-Active Agents, Detergents", "soap detergent washing powder cleaning liquid bar", 18.0),
    ("35", "HARDWARE", "Albuminoidal Substances, Modified Starches, Glues", "fevicol glue adhesive gelatin industrial enzyme", 18.0),
    ("36", "GENERAL", "Explosives, Pyrotechnic Products, Matches, Alloys", "matchbox safety matches firecrackers pyrotechnics", 12.0),
    ("37", "GENERAL", "Photographic or Cinematographic Goods", "photo film camera paper chemicals developing", 18.0),
    ("38", "GROCERY", "Miscellaneous Chemical Products", "pesticides disinfectant mosquito repellent sanitizer", 18.0),
    ("39", "HARDWARE", "Plastics and Articles Thereof", "plastic pipe tank bucket sheet polymers fittings", 18.0),
    ("40", "FOOTWEAR_UTENSILS_AUTO", "Rubber and Articles Thereof", "tyre tube rubber gloves conveyor belt sheet", 18.0),
    ("41", "FOOTWEAR_UTENSILS_AUTO", "Raw Hides and Skins and Leather", "raw leather hides skins tanning pelt", 5.0),
    ("42", "FOOTWEAR_UTENSILS_AUTO", "Articles of Leather, Saddlery, Travel Goods, Handbags", "leather bag wallet belt suitcase travel luggage", 18.0),
    ("43", "TEXTILES", "Furskins and Artificial Fur, Manufactures", "fur artificial fur coat apparel skin", 18.0),
    ("44", "HARDWARE", "Wood and Articles of Wood, Wood Charcoal", "timber wood plywood ply board planks lakkad", 18.0),
    ("45", "GENERAL", "Cork and Articles of Cork", "cork stoppers agglomerated cork tiles", 12.0),
    ("46", "GENERAL", "Manufactures of Straw, Esparto or Other Plaiting", "basketwork matting straw articles wicker", 12.0),
    ("47", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Pulp of Wood or Other Fibrous Cellulosic Material", "wood pulp recovered waste paper recycled pulp", 12.0),
    ("48", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Paper and Paperboard, Articles of Paper Pulp", "paper stationery notebook carton box a4 paper", 18.0),
    ("49", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Printed Books, Newspapers, Pictures, Manuscripts", "books school textbooks newspaper printed map pamphlet", 0.0),
    ("50", "TEXTILES", "Silk Yarn and Fabrics", "silk yarn silk fabric resham banarasi saree", 5.0),
    ("51", "TEXTILES", "Wool, Fine or Coarse Animal Hair, Yarn & Fabric", "wool yarn woollen fabric pashmina blanket", 5.0),
    ("52", "TEXTILES", "Cotton Yarn and Fabrics", "cotton yarn cotton fabric thaan kapda poplin", 5.0),
    ("53", "TEXTILES", "Other Vegetable Textile Fibres, Paper Yarn & Fabrics", "jute yarn flax hemp jute bag hessian fabric", 5.0),
    ("54", "TEXTILES", "Man-Made Filaments, Strip & Similar Textile Materials", "polyester synthetic yarn nylon filament fabric", 5.0),
    ("55", "TEXTILES", "Man-Made Staple Fibres, Yarn & Fabrics", "staple fibre viscose spun yarn polyester fabric", 5.0),
    ("56", "TEXTILES", "Wadding, Felt & Nonwovens, Special Yarns, Twine, Ropes", "twine cordage rope felt wadding nonwoven", 12.0),
    ("57", "TEXTILES", "Carpets and Other Textile Floor Coverings", "carpets rugs matting floor covering darri kalin", 12.0),
    ("58", "TEXTILES", "Special Woven Fabrics, Tufted Textile, Lace, Tapestries", "lace embroidery badge ribbon velvet narrow fabric", 12.0),
    ("59", "TEXTILES", "Impregnated, Coated, Covered or Laminated Textile", "tarpaulin coated fabric laminated textile tirpal", 12.0),
    ("60", "TEXTILES", "Knitted or Crocheted Fabrics", "knitted fabric hosiery cloth lycra stretch fabric", 5.0),
    ("61", "TEXTILES", "Articles of Apparel & Clothing Accessories, Knitted", "readymade knitted garments t-shirt sweater socks", 12.0),
    ("62", "TEXTILES", "Articles of Apparel & Clothing Accessories, Not Knitted", "readymade garments shirt pants suit saree dress", 12.0),
    ("63", "TEXTILES", "Other Made Up Textile Articles, Sets, Worn Clothing", "bedsheet towel curtains blanket rag sacks", 12.0),
    ("64", "FOOTWEAR_UTENSILS_AUTO", "Footwear, Gaiters and the Like, Parts of Such Articles", "shoes chappal sandals slippers sports shoes boots", 18.0),
    ("65", "TEXTILES", "Headgear and Parts Thereof", "cap hat turban helmet headgear", 18.0),
    ("66", "GENERAL", "Umbrellas, Sun Umbrellas, Walking-Sticks, Whips", "umbrella chhatri parasol walking stick cane", 12.0),
    ("67", "GENERAL", "Prepared Feathers, Down & Articles Made Thereof", "artificial flowers feathers down wigs hair", 18.0),
    ("68", "HARDWARE", "Articles of Stone, Plaster, Cement, Asbestos, Mica", "marble slab granite kota stone cement articles sheet", 18.0),
    ("69", "HARDWARE", "Ceramic Products", "tiles bricks wash basin sanitaryware ceramic pot", 18.0),
    ("70", "HARDWARE", "Glass and Glassware", "glass window glass mirror bottle glass sheet", 18.0),
    ("71", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Natural/Cultured Pearls, Precious Stones & Jewellery", "gold silver jewellery diamond pearls coins gehna", 3.0),
    ("72", "HARDWARE", "Iron and Steel", "iron steel tmt sariya angle channel sheet coil", 18.0),
    ("73", "HARDWARE", "Articles of Iron or Steel", "pipes tubes nut bolt screw nail tank container", 18.0),
    ("74", "FOOTWEAR_UTENSILS_AUTO", "Copper and Articles Thereof", "copper wire brass copper utensils pipe rod sheet", 18.0),
    ("75", "GENERAL", "Nickel and Articles Thereof", "nickel bars rods wire plates sheets", 18.0),
    ("76", "FOOTWEAR_UTENSILS_AUTO", "Aluminium and Articles Thereof", "aluminium sheet foil utensils cooker door window", 18.0),
    ("78", "GENERAL", "Lead and Articles Thereof", "lead sheets plates pipes tubes scrap", 18.0),
    ("79", "GENERAL", "Zinc and Articles Thereof", "zinc plates sheets strip foil wire", 18.0),
    ("80", "GENERAL", "Tin and Articles Thereof", "tin bars rods wire plates sheet", 18.0),
    ("81", "GENERAL", "Other Base Metals, Cermets, Articles Thereof", "tungsten molybdenum tantalum magnesium metals", 18.0),
    ("82", "HARDWARE", "Tools, Implements, Cutlery, Spoons & Forks of Base Metal", "tools wrench pliers screwdriver knife saw blade", 18.0),
    ("83", "HARDWARE", "Miscellaneous Articles of Base Metal", "padlock godrej lock hinge handle bracket key", 18.0),
    ("84", "ELECTRONICS", "Nuclear Reactors, Boilers, Machinery & Mechanical Appliances", "machinery engine pump motor cooler ac printer", 18.0),
    ("85", "ELECTRONICS", "Electrical Machinery & Equipment, Sound Recorders, TVs", "electrical fan wire switch led tv mobile cctv", 18.0),
    ("86", "GENERAL", "Railway/Tramway Locomotives, Rolling-Stock, Track Fixtures", "railway train track coach locomotive parts", 18.0),
    ("87", "FOOTWEAR_UTENSILS_AUTO", "Vehicles Other Than Railway or Tramway Rolling-Stock", "car bike motorcycle tractor auto truck parts", 28.0),
    ("88", "GENERAL", "Aircraft, Spacecraft, and Parts Thereof", "aircraft airplane helicopter drone spacecraft parts", 18.0),
    ("89", "GENERAL", "Ships, Boats and Floating Structures", "ship boat vessel yacht floating structure", 5.0),
    ("90", "MEDICAL", "Optical, Photographic, Cinematographic, Medical Instruments", "spectacles medical instrument meter gauge lens", 18.0),
    ("91", "GENERAL", "Clocks and Watches and Parts Thereof", "watch wristwatch wall clock timer stopwatch", 18.0),
    ("92", "GENERAL", "Musical Instruments, Parts & Accessories", "harmonium tabla guitar keyboard musical instrument", 18.0),
    ("93", "GENERAL", "Arms and Ammunition, Parts and Accessories", "arms ammunition rifle pistol shotgun weapon", 18.0),
    ("94", "HARDWARE", "Furniture, Bedding, Mattresses, Lamps & Lighting", "furniture sofa bed chair almirah mattress lamp", 18.0),
    ("95", "GENERAL", "Toys, Games and Sports Requisites, Parts & Accessories", "toys board games video games sports equipment ball bat", 18.0),
    ("96", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Miscellaneous Manufactured Articles", "pen pencil zipper button sanitary pads brush", 18.0),
    ("97", "GENERAL", "Works of Art, Collectors' Pieces and Antiques", "paintings antique art sculpture collectibles", 12.0),
    ("98", "GENERAL", "Project Imports, Laboratory Chemicals, Passengers' Baggage", "project imports baggage laboratory chemicals", 18.0),
    ("99", "GENERAL", "Services / Miscellaneous Statutory Fallback", "services miscellaneous job work transport repairs", 18.0),
]


def generate_csv(output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    valid_rates = {0.0, 3.0, 5.0, 12.0, 18.0, 28.0}
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "hsn_code",
            "sector",
            "description",
            "hinglish_aliases",
            "base_gst_rate",
            "has_price_threshold",
            "threshold_amount",
            "above_threshold_gst_rate",
            "default_uqc",
            "cbic_schedule"
        ])
        
        count = 0

        # Write core high-frequency categories first
        for row in ROWS:
            hsn, sector, desc, aliases, rate, has_thresh, thresh_amt, above_rate, uqc = row
            assert rate in valid_rates, f"Invalid rate {rate} in {hsn}"
            if has_thresh:
                assert above_rate in valid_rates, f"Invalid above_rate {above_rate} in {hsn}"
            sched = CBIC_SCHEDULES.get(rate, "Official CBIC Rate Schedule")
            writer.writerow([hsn, sector, desc, aliases, rate, has_thresh, thresh_amt, above_rate, uqc, sched])
            count += 1

        # Write 99 Chapter fallbacks
        for chap_row in CHAPTER_FALLBACKS:
            hsn, sector, desc, aliases, rate = chap_row
            assert rate in valid_rates, f"Invalid rate {rate} in chapter {hsn}"
            sched = f"Chapter {hsn} - {CBIC_SCHEDULES.get(rate, 'CBIC General Rate')}"
            writer.writerow([hsn, sector, f"Chapter {hsn}: {desc}", aliases, rate, False, 0, 0.0, "PCS", sched])
            count += 1

    print(f"Generated {count} records in {output_path}")


if __name__ == "__main__":
    generate_csv(Path("data/hsn_master.csv"))
    generate_csv(Path("backend/data/hsn_master.csv"))
