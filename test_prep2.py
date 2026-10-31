from image_preprocessor import preprocess_bill_image

img_path = 'C:/Users/Pranav/.gemini/antigravity/brain/572284f7-c4b9-4b72-aafb-fee7454af5a0/.user_uploaded/media_1793454698316_84c4d814.jpg'
with open(img_path, 'rb') as f:
    bytes_data = f.read()

res = preprocess_bill_image(bytes_data)
print("Preprocessed successfully!")
print("Hash:", res["sha256_hash"])

