"""
Seed initial categories, sample vendor, and products for FoodX marketplace.
"""
from decimal import Decimal
import uuid
from app import create_app
from app.extensions import db
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.product import Category, Product
from app.models.wallet import Wallet

def seed_data():
    app = create_app()
    with app.app_context():
        # Check if already seeded
        if Category.query.first():
            print("Database already contains categories. Skipping seed.")
            return

        print("Seeding FoodX categories...")
        categories_data = [
            {"name_en": "Flour & Grains", "name_ar": "الدقيق والحبوب", "icon": "🌾", "slug": "flour-grains"},
            {"name_en": "Cooking Oil & Ghee", "name_ar": "الزيوت والسمن", "icon": "🌻", "slug": "oils-ghee"},
            {"name_en": "Sugar, Tea & Coffee", "name_ar": "السكر والشاي والبن", "icon": "☕", "slug": "sugar-tea"},
            {"name_en": "Canned & Packaged Food", "name_ar": "المعلبات والمواد الغذائية", "icon": "🥫", "slug": "canned-foods"},
            {"name_en": "Dairy & Cheeses", "name_ar": "الألبان والأجبان", "icon": "🧀", "slug": "dairy"},
            {"name_en": "Juices & Beverages", "name_ar": "العصائر والمشروبات", "icon": "🧃", "slug": "beverages"},
            {"name_en": "Cleaning & Detergents", "name_ar": "المنظفات ومستلزمات النظافة", "icon": "🧼", "slug": "cleaning"},
            {"name_en": "Spices & Seasoning", "name_ar": "البهارات والتوابل", "icon": "🧂", "slug": "spices"},
        ]

        categories = {}
        for cat in categories_data:
            c = Category(
                name_en=cat["name_en"],
                name_ar=cat["name_ar"],
                icon=cat["icon"],
                slug=cat["slug"]
            )
            db.session.add(c)
            categories[cat["slug"]] = c

        db.session.flush()

        print("Seeding sample factory / wholesaler vendor...")
        vendor_user = User(
            id=uuid.uuid4(),
            phone="+249912345678",
            email="factory@foodx.sd",
            full_name="مصنع النيل للمنتجات الغذائية",
            role=UserRole.VENDOR,
            city="Khartoum",
            address="الخرطوم بحري - المنطقة الصناعية",
            lang_pref="ar",
            is_active=True,
            phone_verified=True
        )
        vendor_user.set_password("Vendor123456")
        db.session.add(vendor_user)
        db.session.flush()

        vendor = Vendor(
            id=uuid.uuid4(),
            user_id=vendor_user.id,
            business_name="Al-Neel Food Industries",
            business_name_ar="شركة النيل للصناعات الغذائية",
            description="Leading manufacturer and wholesale supplier of flour, oil and food supplies in Khartoum.",
            description_ar="أكبر مورد ومصنع للجملة لمواد الدقيق والزيوت والمواد التموينية في الخرطوم.",
            phone="+249912345678",
            address="المنطقة الصناعية - بحري",
            is_verified=True,
            rating=4.9
        )
        db.session.add(vendor)

        # Create wallet for vendor
        vendor_wallet = Wallet(
            id=uuid.uuid4(),
            user_id=vendor_user.id,
            balance=Decimal("250000.00")
        )
        db.session.add(vendor_wallet)

        # Create Retailer user
        retailer_user = User(
            id=uuid.uuid4(),
            phone="+249987654321",
            email="retailer@foodx.sd",
            full_name="بقالة الأمانة (الخرطوم)",
            role=UserRole.RETAILER,
            city="Khartoum",
            address="الخرطوم - الرياض شارع المشتل",
            lang_pref="ar",
            is_active=True,
            phone_verified=True
        )
        retailer_user.set_password("Retailer123456")
        db.session.add(retailer_user)
        db.session.flush()

        retailer_wallet = Wallet(
            id=uuid.uuid4(),
            user_id=retailer_user.id,
            balance=Decimal("150000.00")
        )
        db.session.add(retailer_wallet)

        # Create Admin user
        admin_user = User(
            id=uuid.uuid4(),
            phone="+249900000000",
            email="admin@foodx.sd",
            full_name="مدير منصة FoodX",
            role=UserRole.ADMIN,
            city="Khartoum",
            address="الخرطوم - المقر الرئيسي",
            lang_pref="ar",
            is_active=True,
            phone_verified=True
        )
        admin_user.set_password("Admin123456")
        db.session.add(admin_user)
        db.session.flush()

        admin_wallet = Wallet(
            id=uuid.uuid4(),
            user_id=admin_user.id,
            balance=Decimal("500000.00")
        )
        db.session.add(admin_wallet)

        print("Seeding wholesale products...")
        products_data = [
            {
                "category": "flour-grains",
                "name_en": "Sayga Bakeries Flour - 25kg Sack",
                "name_ar": "دقيق سيقا للمخابز - جوال 25 كيلو",
                "desc_en": "High quality wheat flour for bakeries and grocery retail. Wholesale sack 25kg.",
                "desc_ar": "دقيق قمح فاخر مخصص للمخابز والبقالات بالجملة، جوال زنة 25 كيلو.",
                "price": Decimal("28500.00"),
                "unit": "sack",
                "min_order": 5,
                "stock": 250,
                "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop"
            },
            {
                "category": "oils-ghee",
                "name_en": "Yara Pure Sunflower Oil - Carton (4x4L)",
                "name_ar": "زيت يارا عباد الشمس النقي - كرتونة (4 × 4 لتر)",
                "desc_en": "Pure refined sunflower oil wholesale carton containing 4 cans of 4 liters each.",
                "desc_ar": "كرتونة زيت عباد الشمس النقي بالجملة تحتوي على 4 جوالين سعة 4 لتر.",
                "price": Decimal("38000.00"),
                "unit": "carton",
                "min_order": 3,
                "stock": 180,
                "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop"
            },
            {
                "category": "sugar-tea",
                "name_en": "Kenana White Pure Sugar - 50kg Sack",
                "name_ar": "سكر كنانة أبيض نقي - جوال 50 كيلو",
                "desc_en": "Original Kenana refined white cane sugar 50kg sack for wholesale and retail.",
                "desc_ar": "سكر كنانة الأبيض النقي الأصلي جوال 50 كيلو لتجار التجزئة والبقالات.",
                "price": Decimal("72000.00"),
                "unit": "sack",
                "min_order": 2,
                "stock": 120,
                "image_url": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop"
            },
            {
                "category": "sugar-tea",
                "name_en": "Ghazalain Black Tea - Carton (24x450g)",
                "name_ar": "شاي الغزالتين أسود نخب أول - كرتونة (24 × 450 جرام)",
                "desc_en": "First grade Ceylon black tea carton with 24 boxes of 450g.",
                "desc_ar": "كرتونة شاي سيلاني فاخر كرتونة تحتوي على 24 باكت 450 جرام.",
                "price": Decimal("44000.00"),
                "unit": "carton",
                "min_order": 2,
                "stock": 95,
                "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop"
            },
            {
                "category": "canned-foods",
                "name_en": "California Garden Fava Beans - Carton (24x400g)",
                "name_ar": "فول حدائق كاليفورنيا سادة - كرتونة (24 علبة)",
                "desc_en": "Wholesale carton of premium plain fava beans 24 cans of 400g.",
                "desc_ar": "كرتونة فول مدمس حدائق كاليفورنيا درجة أولى تحتوي على 24 علبة زنة 400 جرام.",
                "price": Decimal("26500.00"),
                "unit": "carton",
                "min_order": 4,
                "stock": 160,
                "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop"
            },
            {
                "category": "dairy",
                "name_en": "Capo Full Cream Powder Milk - Carton (12x900g)",
                "name_ar": "حليب كابو مجفف كامل الدسم - كرتونة (12 × 900 جرام)",
                "desc_en": "Wholesale carton of Capo full cream instant milk powder 12 pouches.",
                "desc_ar": "كرتونة حليب بودرة كابو سريع الذوبان كامل الدسم كرتونة 12 كيس زنة 900 جرام.",
                "price": Decimal("64000.00"),
                "unit": "carton",
                "min_order": 2,
                "stock": 80,
                "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop"
            },
            {
                "category": "cleaning",
                "name_en": "Omo Active Fresh Detergent - Box (12x1kg)",
                "name_ar": "مسحوق غسيل أومو اكتيف - باكت كبير (12 × 1 كجم)",
                "desc_en": "Omo multi-action high foaming laundry detergent carton for retailers.",
                "desc_ar": "كرتونة مسحوق غسيل أومو الفعال رغوة وفيرة للبقالات كرتونة 12 كيس.",
                "price": Decimal("31000.00"),
                "unit": "box",
                "min_order": 3,
                "stock": 140,
                "image_url": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop"
            }
        ]

        for p_data in products_data:
            cat = categories[p_data["category"]]
            prod = Product(
                id=uuid.uuid4(),
                vendor_id=vendor.id,
                category_id=cat.id,
                name_en=p_data["name_en"],
                name_ar=p_data["name_ar"],
                description_en=p_data["desc_en"],
                description_ar=p_data["desc_ar"],
                price=p_data["price"],
                unit=p_data["unit"],
                min_order_qty=p_data["min_order"],
                stock_qty=p_data["stock"],
                image_url=p_data["image_url"],
                is_active=True
            )
            db.session.add(prod)

        db.session.commit()
        print("Seeding completed successfully! FoodX is loaded with test data.")

if __name__ == "__main__":
    seed_data()
