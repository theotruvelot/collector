/**
 * Seed script for local development.
 * Writes directly into the miniflare D1 SQLite file.
 *
 * Usage:
 *   bun run db:seed
 *
 * ⚠️  The dev server (alchemy / wrangler) must have been started at least once
 *     so the .sqlite file exists.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

// ── Locate the miniflare D1 sqlite file ──────────────────────────────────────

const MINIFLARE_DIR = join(
    import.meta.dir,
    "../../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

if (!existsSync(MINIFLARE_DIR)) {
    console.error(
        "❌  Miniflare D1 directory not found.\n" +
        "   Start the dev server at least once with `bun run dev` before seeding.",
    );
    process.exit(1);
}

const sqliteFiles = readdirSync(MINIFLARE_DIR).filter((f) =>
    f.endsWith(".sqlite"),
);

if (sqliteFiles.length === 0) {
    console.error(
        "❌  No .sqlite file found in miniflare D1 directory.\n" +
        "   Start the dev server at least once with `bun run dev`.",
    );
    process.exit(1);
}

const DB_PATH = join(MINIFLARE_DIR, sqliteFiles[0]!);
console.log(`📂  Using database: ${sqliteFiles[0]}\n`);

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid() {
    return crypto.randomUUID();
}

function now() {
    return Date.now();
}

function slug(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// ── Clear existing seed data (idempotent) ─────────────────────────────────────

console.log("🧹  Clearing existing seed data…");

db.exec(`
  DELETE FROM notification;
  DELETE FROM price_history;
  DELETE FROM "order";
  DELETE FROM article_image;
  DELETE FROM article;
  DELETE FROM category;
  DELETE FROM account WHERE provider_id = 'credential' AND account_id IN (
    SELECT email FROM user WHERE email LIKE '%@seed.collector'
  );
  DELETE FROM session WHERE user_id IN (
    SELECT id FROM user WHERE email LIKE '%@seed.collector'
  );
  DELETE FROM user WHERE email LIKE '%@seed.collector';
`);

// ── Seed users ────────────────────────────────────────────────────────────────

console.log("👤  Seeding users…");

const USERS = [
    { name: "Alice Martin", email: "alice@seed.collector" },
    { name: "Bob Dupont", email: "bob@seed.collector" },
    { name: "Clara Nguyen", email: "clara@seed.collector" },
] as const;

const userIds: Record<string, string> = {};

const insertUser = db.prepare(`
  INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at)
  VALUES (?, ?, ?, 1, 'user', ?, ?)
`);

for (const u of USERS) {
    const id = uuid();
    userIds[u.email] = id;
    insertUser.run(id, u.name, u.email, now(), now());
}

console.log(`   ✅  ${USERS.length} users created`);

// ── Seed categories ───────────────────────────────────────────────────────────

console.log("🗂   Seeding categories…");

const CATEGORIES = [
    {
        name: "Vintage Watches",
        description: "Mechanical and quartz timepieces from past decades",
    },
    {
        name: "Sports Cards",
        description: "Trading cards for football, basketball, baseball and more",
    },
    {
        name: "Vinyl Records",
        description: "LPs, EPs and singles from all genres and eras",
    },
    {
        name: "Comics & Manga",
        description: "Classic and modern comic books and manga volumes",
    },
    {
        name: "Vintage Cameras",
        description: "Film cameras, Polaroids and photographic accessories",
    },
    {
        name: "Action Figures",
        description: "Collectible toys and figurines from movies, anime and games",
    },
] as const;

const categoryIds: Record<string, string> = {};

const insertCategory = db.prepare(`
  INSERT INTO category (id, name, slug, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const cat of CATEGORIES) {
    const id = uuid();
    categoryIds[cat.name] = id;
    insertCategory.run(id, cat.name, slug(cat.name), cat.description, now(), now());
}

console.log(`   ✅  ${CATEGORIES.length} categories created`);

// ── Seed articles ─────────────────────────────────────────────────────────────

console.log("📦  Seeding articles…");

type ArticleSeed = {
    title: string;
    description: string;
    price: number;
    shippingCost: number;
    category: (typeof CATEGORIES)[number]["name"];
    seller: (typeof USERS)[number]["email"];
    images: string[];
};

const ARTICLES: ArticleSeed[] = [
    // Watches
    {
        title: "Seiko 5 Sports 1972",
        description:
            "Automatic movement, original bracelet, dial in excellent condition. A Japanese icon from the early 70s.",
        price: 180,
        shippingCost: 8,
        category: "Vintage Watches",
        seller: "alice@seed.collector",
        images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"],
    },
    {
        title: "Tissot Seastar Automatic",
        description:
            "Swiss made, working perfectly. Case diameter 38mm. Light scratches on case consistent with age.",
        price: 340,
        shippingCost: 12,
        category: "Vintage Watches",
        seller: "bob@seed.collector",
        images: ["https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=600"],
    },
    {
        title: "Casio G-Shock DW-5600",
        description:
            "Classic black square G-Shock. Original module, all functions working. Minor fading on bezel.",
        price: 95,
        shippingCost: 5,
        category: "Vintage Watches",
        seller: "clara@seed.collector",
        images: ["https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600"],
    },

    // Sports Cards
    {
        title: "Zinedine Zidane Rookie Card 1994 PSA 8",
        description:
            "Zidane rookie from the Panini collection, graded PSA 8. Near mint condition.",
        price: 420,
        shippingCost: 0,
        category: "Sports Cards",
        seller: "alice@seed.collector",
        images: ["https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600"],
    },
    {
        title: "LeBron James Upper Deck 2003 RC",
        description:
            "LeBron James rookie card in excellent condition. Light corner wear.",
        price: 850,
        shippingCost: 10,
        category: "Sports Cards",
        seller: "bob@seed.collector",
        images: ["https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600"],
    },

    // Vinyl Records
    {
        title: "Pink Floyd – The Dark Side of the Moon (1973 UK press)",
        description:
            "Original UK pressing on Harvest Records. Vinyl grades VG+, cover grades VG.",
        price: 280,
        shippingCost: 15,
        category: "Vinyl Records",
        seller: "clara@seed.collector",
        images: ["https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?w=600"],
    },
    {
        title: "Daft Punk – Homework (1997 French press)",
        description: "Double LP, original pressing. Both records grade EX/EX.",
        price: 120,
        shippingCost: 12,
        category: "Vinyl Records",
        seller: "alice@seed.collector",
        images: ["https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=600"],
    },
    {
        title: "Miles Davis – Kind of Blue",
        description:
            "CBS reissue from the 70s. Great for listening, cover has slight wear.",
        price: 65,
        shippingCost: 10,
        category: "Vinyl Records",
        seller: "bob@seed.collector",
        images: ["https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600"],
    },

    // Comics
    {
        title: "Amazing Spider-Man #300 (1988)",
        description:
            "First full appearance of Venom. Ungraded, VF condition. No missing pages.",
        price: 390,
        shippingCost: 8,
        category: "Comics & Manga",
        seller: "clara@seed.collector",
        images: ["https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600"],
    },
    {
        title: "Dragon Ball Z Vol. 1-10 (French edition)",
        description:
            "Complete set of the first 10 volumes. Minor shelf wear, all readable.",
        price: 75,
        shippingCost: 12,
        category: "Comics & Manga",
        seller: "alice@seed.collector",
        images: ["https://images.unsplash.com/photo-1610900664849-2e91eed6cc1a?w=600"],
    },

    // Cameras
    {
        title: "Nikon FM2 body – Silver",
        description:
            "Fully mechanical SLR. Shutter tested at all speeds. Mirror and viewfinder clean. Light seals replaced.",
        price: 290,
        shippingCost: 15,
        category: "Vintage Cameras",
        seller: "bob@seed.collector",
        images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600"],
    },
    {
        title: "Polaroid OneStep Express",
        description:
            "Tested with fresh 600 film. Great condition, works perfectly. Retro instant photography.",
        price: 55,
        shippingCost: 0,
        category: "Vintage Cameras",
        seller: "clara@seed.collector",
        images: ["https://images.unsplash.com/photo-1589395595558-b91c679d47bc?w=600"],
    },

    // Action Figures
    {
        title: "Star Wars Vintage Collection – Boba Fett (1979)",
        description:
            "Original Kenner figure, all accessories present. Light playwear consistent with age.",
        price: 380,
        shippingCost: 10,
        category: "Action Figures",
        seller: "alice@seed.collector",
        images: ["https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=600"],
    },
    {
        title: "Transformers G1 Optimus Prime – Complete",
        description:
            "Generation 1 Optimus. Complete with trailer and all accessories. Stickers 90% intact.",
        price: 650,
        shippingCost: 20,
        category: "Action Figures",
        seller: "bob@seed.collector",
        images: ["https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=600"],
    },
];

const insertArticle = db.prepare(`
  INSERT INTO article (id, title, slug, description, price, shipping_cost, status, category_id, seller_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)
`);

const insertImage = db.prepare(`
  INSERT INTO article_image (id, article_id, url, "order")
  VALUES (?, ?, ?, 0)
`);

const articleIds: string[] = [];

for (const art of ARTICLES) {
    const id = uuid();
    articleIds.push(id);

    insertArticle.run(
        id,
        art.title,
        slug(art.title),
        art.description,
        art.price,
        art.shippingCost,
        categoryIds[art.category],
        userIds[art.seller],
        now(),
        now(),
    );

    for (const url of art.images) {
        insertImage.run(uuid(), id, url);
    }
}

console.log(`   ✅  ${ARTICLES.length} articles created`);

// ── Done ──────────────────────────────────────────────────────────────────────

db.close();

console.log(`
✨  Seed complete!
   ${USERS.length} users · ${CATEGORIES.length} categories · ${ARTICLES.length} articles

💡  Tip: You can log in with any seed user, the password functionality
    is handled by better-auth. Use the register form to create real accounts.
`);
