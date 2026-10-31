import generate_all_india_hsn

MORE_ROWS = [
    # More Grocery
    ("0702", "GROCERY", "Fresh Tomatoes / Tamatar (Loose)", "fresh tomato tamatar desi tamatar cherry tomato टमाटर", 0.0, False, 0, 0.0, "KGS"),
    ("0703", "GROCERY", "Fresh Onions / Pyaz / Kanda (Loose)", "fresh onion pyaz kanda nasik onion लाल प्याज कांदा", 0.0, False, 0, 0.0, "KGS"),
    ("0701", "GROCERY", "Fresh Potatoes / Aloo / Batata (Loose)", "fresh potato aloo pahadi aloo batata आलू बटाटा", 0.0, False, 0, 0.0, "KGS"),
    ("0804", "GROCERY", "Dates / Khajoor / Dry Coconut / Gola / Nariyal", "khajoor dates sukha nariyal dry coconut gola copra खजूर सूखा नारियल", 5.0, False, 0, 0.0, "KGS"),
    ("1202", "GROCERY", "Groundnuts / Mungfali / Peanuts (Raw/Roasted)", "peanuts mungfali raw groundnut roasted peanut shengdana मूंगफली", 5.0, False, 0, 0.0, "KGS"),
    ("0904", "GROCERY", "Black Pepper / Kali Mirch / White Pepper", "black pepper kali mirch sabut kali mirch safed mirch गोल मिर्च काली मिर्च", 5.0, False, 0, 0.0, "KGS"),
    ("0908", "GROCERY", "Nutmeg / Mace / Jaiphal / Javitri", "nutmeg jaiphal mace javitri sabut jaiphal जायफल जावित्री", 5.0, False, 0, 0.0, "KGS"),
    ("0909", "GROCERY", "Anise / Badian / Fennel / Saunf / Jeera", "saunf fennel seeds moti saunf barik saunf badian star anise सौंफ", 5.0, False, 0, 0.0, "KGS"),
    ("1211", "GROCERY", "Medicinal Herbs / Tulsi / Ashwagandha / Giloy", "tulsi ashwagandha giloy mulethi neem powder amla powder जड़ी बूटी", 5.0, False, 0, 0.0, "KGS"),
    ("1704", "GROCERY", "Sugar Boiled Confectionery / Candy / Lollipops", "boiled candy lollipop pulse toffee mango bite fruit candy टॉफी लॉलीपॉप", 18.0, False, 0, 0.0, "PCS"),
    ("2104", "GROCERY", "Soups / Broths / Soup Powder (Knorr/Maggi)", "soup knorr soup tomato soup sweet corn soup soup mix सूप", 18.0, False, 0, 0.0, "PCS"),
    ("2103", "GROCERY", "Mixed Seasonings / Pasta Sauce / Schezwan Chutney (Ching's)", "schezwan chutney chings secret pasta sauce pizza pasta sauce pizza sauce शेजवान चटनी", 12.0, False, 0, 0.0, "PCS"),
    ("2008", "GROCERY", "Canned Fruits / Sweet Corn / Canned Pineapple", "canned sweet corn sweet corn tin pineapple slice canned fruit cocktail स्वीट कॉर्न", 12.0, False, 0, 0.0, "PCS"),
    ("1901", "GROCERY", "Malted Food Drinks / Health Drinks (Horlicks/Bournvita/Boost)", "horlicks bournvita boost complan malt drink chocolate drink हॉर्लिक्स बॉर्नविटा", 18.0, False, 0, 0.0, "KGS"),

    # More Restaurant Food
    ("9963", "RESTAURANT_FOOD", "Dosa / Masala Dosa / Idli Sambar / Vada", "masala dosa plain dosa idli sambar medu vada uttapam onion rava dosa दक्षिण भारतीय डोसा इडली", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "South Indian Meals / Rice Thali / Curd Rice", "south indian meals thali curd rice lemon rice rasam rice सांबर राइस", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Momos / Dim Sum (Veg / Paneer / Chicken)", "steamed momos fried momos veg momos tandoori momos chicken momos मोमोज़", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Rolls / Wraps / Kathi Roll (Paneer / Egg / Chicken)", "kathi roll paneer roll veg roll egg roll chicken roll wrap रोल काठी रोल", 5.0, False, 0, 0.0, "PCS"),
    ("9963", "RESTAURANT_FOOD", "Indian Breads / Roti / Paratha / Naan / Bhatura", "tandoori roti butter naan lachha paratha aloo paratha bhatura plain naan तंदूरी रोटी पराठा", 5.0, False, 0, 0.0, "PCS"),

    # More Textiles
    ("6304", "TEXTILES", "Sofa Covers / Cushion Covers / Table Cloth", "sofa cover cushion cover pillow cushion table cover runner sofa fabric सोफा कवर कुशन", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6301", "TEXTILES", "Woollen Blankets / Quilt / Razai / Dohar", "woollen blanket mink blanket single bed blanket double bed razai dohar quilt रजाई कम्बल दोहर", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6212", "TEXTILES", "Brassieres / Girdles / Corsets / Innerwear", "bra brassiere lingerie innerwear cotton slips shapewear लेडीज इनरवियर", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6205", "TEXTILES", "Men Formal Shirts / Cotton Khadi Shirt", "mens formal shirt khadi shirt cotton linen shirt button shirt कमीज शर्ट", 5.0, True, 1000.0, 12.0, "PCS"),
    ("6206", "TEXTILES", "Women Blouses / Tops / Shirts", "ladies blouse stitched blouse crop top tunics printed tops ब्लाउज टॉप", 5.0, True, 1000.0, 12.0, "PCS"),

    # More Hardware
    ("7324", "HARDWARE", "Stainless Steel Kitchen Sink (Nirali/Hindware)", "kitchen sink stainless steel sink single bowl sink double bowl sink सिंक किचन सिंक", 18.0, False, 0, 0.0, "PCS"),
    ("6806", "HARDWARE", "Rockwool / Glass Wool / Thermal Insulation Material", "thermal insulation glass wool rockwool acoustic foam glasswool इन्सुलेशन", 18.0, False, 0, 0.0, "SQF"),
    ("7610", "HARDWARE", "Aluminium Window Frames / Sliding Section / Doors", "aluminium window aluminium sliding section partition door frame दरवाजा खिड़की", 18.0, False, 0, 0.0, "SQF"),
    ("8307", "HARDWARE", "Flexible Tubing / Metallic Conduit / Braided Hose", "flexible hose braided pipe connection pipe flexible metallic pipe होज पाइप", 18.0, False, 0, 0.0, "PCS"),
    ("7317", "HARDWARE", "Wire Nails / Concrete Steel Nails / Panel Pins", "concrete nails steel nails wire nails gajendra keel panel pins कांक्रीट कील", 18.0, False, 0, 0.0, "KGS"),

    # More Electronics
    ("8516", "ELECTRONICS", "Hair Dryer / Hair Straightener / Trimmer (Philips/Nova)", "hair dryer hair straightener trimmer shaver beard trimmer हेयर ड्रायर ट्रिमर", 18.0, False, 0, 0.0, "PCS"),
    ("8509", "ELECTRONICS", "Vacuum Cleaner / Floor Polisher (Eureka Forbes/Philips)", "vacuum cleaner eureka forbes wet dry vacuum floor cleaner वैक्यूम क्लीनर", 18.0, False, 0, 0.0, "PCS"),
    ("8523", "ELECTRONICS", "USB Pen Drive / SD Memory Card / External SSD (SanDisk)", "pen drive usb drive memory card micro sd sandisk external hard disk पेन ड्राइव मेमोरी कार्ड", 18.0, False, 0, 0.0, "PCS"),
    ("8531", "ELECTRONICS", "Electric Calling Bell / Door Bell / Buzzer (Anchor/Cona)", "door bell calling bell ding dong bell musical bell electric buzzer कॉलिंग बेल", 18.0, False, 0, 0.0, "PCS"),
    ("8537", "ELECTRONICS", "Automatic Changeover Switch / Generator Switch", "changeover switch automatic changeover generator selector panel चेंजओवर स्विच", 18.0, False, 0, 0.0, "PCS"),

    # More Medical
    ("9021", "MEDICAL", "Orthopaedic Appliances / Fracture Splints / Knee Braces", "knee brace cervical collar lumbar support belt fracture splint crutches ऑर्थोपेडिक बेल्ट", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Antiseptic Liquid / Cream (Dettol/Savlon/Betadine)", "dettol liquid savlon liquid betadine ointment burnol antiseptic cream एंटीसेप्टिक लिक्विड", 12.0, False, 0, 0.0, "PCS"),
    ("3004", "MEDICAL", "Cough Lozenges / Strepsils / Vicks Vaporub", "strepsils vicks vapo rub cough lozenges vicks inhaler विक्स वेपोरब", 12.0, False, 0, 0.0, "PCS"),
    ("9018", "MEDICAL", "Surgical Gloves / Latex Examination Gloves", "surgical gloves latex gloves examination gloves nitrile gloves सर्जिकल दस्ताने", 12.0, False, 0, 0.0, "BOX"),

    # More Auto / Utensils
    ("7323", "FOOTWEAR_UTENSILS_AUTO", "Steel Tiffin Box / Lunch Box / Dabba", "tiffin box steel tiffin lunch box dabba multi tier tiffin टिफिन डिब्बा", 12.0, False, 0, 0.0, "PCS"),
    ("8512", "FOOTWEAR_UTENSILS_AUTO", "Vehicle Horn / Bulb / Headlight / Indicator", "bike horn car horn headlight bulb indicator bulb led headlight हॉर्न बल्ब", 28.0, False, 0, 0.0, "PCS"),
    ("8421", "FOOTWEAR_UTENSILS_AUTO", "Automobile Oil Filter / Air Filter / Fuel Filter", "oil filter air filter fuel filter diesel filter car filter बाइक कार फिल्टर", 28.0, False, 0, 0.0, "PCS"),
    ("8714", "FOOTWEAR_UTENSILS_AUTO", "Bicycle / Cycle Parts & Accessories (Hero/Atlas)", "bicycle cycle cycle tyre tube paddle chain hero cycle साइकिल", 12.0, False, 0, 0.0, "PCS"),

    # More Stationery & Services
    ("4817", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Paper Envelopes / Postal Covers / Khaki Lifafa", "paper envelope postal cover khaki lifafa document cover लिफाफा", 18.0, False, 0, 0.0, "PCS"),
    ("9612", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Typewriter Ribbon / Printer Ribbon / Inked Ribbon", "printer ribbon typewriter ribbon passbook ribbon रिबन", 18.0, False, 0, 0.0, "PCS"),
    ("3506", "STATIONERY_JEWELLERY_AGRI_SERVICES", "Glue Stick / Gum Bottle / Craft Adhesive (Fevistick)", "fevistick glue stick paper gum office paste गोंद फेविस्टिक", 18.0, False, 0, 0.0, "PCS"),
]

with open("generate_all_india_hsn.py", "r", encoding="utf-8") as f:
    text = f.read()

# Add MORE_ROWS into ROWS list
pos = text.rfind("]")
new_text = text[:pos] + "\n    # --- Extra High-Frequency Retail Categories ---\n"
for r in MORE_ROWS:
    new_text += f"    {repr(r)},\n"
new_text += text[pos:]

with open("generate_all_india_hsn.py", "w", encoding="utf-8") as f:
    f.write(new_text)

print(f"Appended {len(MORE_ROWS)} rows to generate_all_india_hsn.py")

