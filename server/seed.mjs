import { randomUUID } from "node:crypto";

const DAY = 24 * 60 * 60 * 1000;

function iso(time) {
  return new Date(time).toISOString();
}

function daysFromNow(days) {
  return iso(Date.now() + days * DAY);
}

function daysAgo(days) {
  return iso(Date.now() - days * DAY);
}

// 仅在寻宠/互助/闲置三张帖子表都为空时填充演示内容；重复启动不会产生重复数据。
export function seedIfEmpty(db) {
  const total = db.prepare(
    "SELECT (SELECT COUNT(*) FROM find_posts) + (SELECT COUNT(*) FROM help_posts) + (SELECT COUNT(*) FROM goods_posts) AS total"
  ).get().total;
  if (total > 0) return false;

  const now = iso(Date.now());
  const users = {};

  function owner(displayName) {
    if (!users[displayName]) {
      users[displayName] = randomUUID();
      db.prepare(
        "INSERT INTO users(id, display_name, account_status, real_name_status, last_login_at, created_at, updated_at) VALUES(?, ?, 'normal', 'unverified', ?, ?, ?)"
      ).run(users[displayName], displayName, now, now, now);
    }
    return users[displayName];
  }

  function insertFind(post) {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO find_posts(id, user_id, pet_name, breed, color_or_features, age, lost_at, lost_location, location_detail, description, reward, contact_note, image_refs, contact_phone, status, expires_at, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 'active', ?, ?, ?)`
    ).run(
      id, owner(post.owner), post.pet_name, post.breed, post.color_or_features, post.age, post.lost_at,
      post.lost_location, post.location_detail, post.description, post.reward, post.contact_note,
      post.contact_phone, daysFromNow(30), post.created_at, post.created_at
    );
  }

  function insertHelp(post) {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO help_posts(id, user_id, help_type, pet_type, pet_description, start_at, end_at, location_area, description, image_refs, contact_phone, status, expires_at, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 'active', ?, ?, ?)`
    ).run(
      id, owner(post.owner), post.help_type, post.pet_type, post.pet_description, post.start_at,
      post.end_at, post.location_area, post.description, post.contact_phone, post.end_at,
      post.created_at, post.created_at
    );
  }

  function insertGoods(post) {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO goods_posts(id, user_id, title, category, price, is_free, condition_level, description, location_area, image_refs, contact_phone, status, expires_at, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 'active', ?, ?, ?)`
    ).run(
      id, owner(post.owner), post.title, post.category, post.price, post.is_free ? 1 : 0,
      post.condition_level, post.description, post.location_area, post.contact_phone,
      daysFromNow(30), post.created_at, post.created_at
    );
  }

  [
    {
      owner: "王女士",
      pet_name: "奶盖",
      breed: "橘猫 · 短毛",
      color_or_features: "橘色短毛，尾巴有浅色环纹",
      age: "女，3岁",
      lost_at: daysAgo(3),
      lost_location: "阳光花园 3 号楼附近",
      location_detail: "常在 3 号楼与社区花园之间活动",
      description: "橘色短毛，尾巴有浅色环纹，见人胆小，请勿追赶。",
      reward: "提供线索酬谢",
      contact_note: "如有线索请联系主人",
      contact_phone: "13800138001",
      created_at: daysAgo(3)
    },
    {
      owner: "李先生",
      pet_name: "豆豆",
      breed: "柯基",
      color_or_features: "黄白色，胸前有白斑",
      age: "男，2岁",
      lost_at: daysAgo(2),
      lost_location: "翠湖公园西门",
      location_detail: null,
      description: "黄白色柯基，胸前有白斑，走失时未戴项圈。",
      reward: null,
      contact_note: "如有线索请及时联系主人",
      contact_phone: "13800138002",
      created_at: daysAgo(2)
    },
    {
      owner: "小周",
      pet_name: "云朵",
      breed: "垂耳兔",
      color_or_features: "白色垂耳，戴浅粉项圈",
      age: "女，1岁",
      lost_at: daysAgo(1),
      lost_location: "梧桐里小区北门",
      location_detail: null,
      description: "白色垂耳兔，戴浅粉项圈，胆子小，请先拍照再联系。",
      reward: null,
      contact_note: "发现后请先拍照并联系主人",
      contact_phone: "13800138003",
      created_at: daysAgo(1)
    }
  ].forEach(insertFind);

  [
    {
      owner: "林阿姨",
      help_type: "上门喂养",
      pet_type: "布偶猫",
      pet_description: "2岁",
      start_at: daysFromNow(2),
      end_at: daysFromNow(4),
      location_area: "阳光花园",
      description: "周末出差，希望邻居帮忙喂食铲砂，可提供猫粮与酬谢。",
      contact_phone: "13800138004",
      created_at: daysAgo(1)
    },
    {
      owner: "小周",
      help_type: "上门喂养",
      pet_type: "金毛",
      pet_description: "温顺",
      start_at: daysFromNow(1),
      end_at: daysFromNow(2),
      location_area: "小区内",
      description: "加班到很晚，需要有人帮忙遛一次狗，小区内即可。",
      contact_phone: "13800138003",
      created_at: daysAgo(1)
    },
    {
      owner: "陈同学",
      help_type: "寄养",
      pet_type: "仓鼠",
      pet_description: null,
      start_at: daysFromNow(5),
      end_at: daysFromNow(12),
      location_area: "待确认",
      description: "回家过节，笼子可一起带走，饲料已备好。",
      contact_phone: "13800138005",
      created_at: daysAgo(0)
    }
  ].forEach(insertHelp);

  [
    {
      owner: "王女士",
      title: "猫爬架（九成新）",
      category: "玩具用品",
      price: 68,
      is_free: false,
      condition_level: "九成新",
      description: "家中猫咪更喜欢窗台，爬架闲置。主体稳固，绳柱轻微使用痕迹，无破损。",
      location_area: "梧桐里自提",
      contact_phone: "13800138001",
      created_at: daysAgo(2)
    },
    {
      owner: "李先生",
      title: "未开封成猫粮 2kg",
      category: "粮食零食",
      price: 45,
      is_free: false,
      condition_level: "全新未拆",
      description: "未开封成猫粮，保存完好。",
      location_area: "阳光花园自提",
      contact_phone: "13800138002",
      created_at: daysAgo(2)
    },
    {
      owner: "小周",
      title: "折叠航空箱",
      category: "笼子窝具",
      price: 80,
      is_free: false,
      condition_level: "九成新",
      description: "折叠便携，适合短途出行。",
      location_area: "翠湖公园附近",
      contact_phone: "13800138003",
      created_at: daysAgo(1)
    },
    {
      owner: "陈同学",
      title: "牵引绳套装",
      category: "牵引服饰",
      price: 22,
      is_free: false,
      condition_level: "八成新",
      description: "牵引绳和胸背套装，适合中小型犬。",
      location_area: "梧桐里自提",
      contact_phone: "13800138005",
      created_at: daysAgo(1)
    },
    {
      owner: "林阿姨",
      title: "宠物沐浴露余量",
      category: "其他用品",
      price: 12,
      is_free: false,
      condition_level: "使用痕迹明显",
      description: "宠物沐浴露，剩余约一半。",
      location_area: "阳光花园",
      contact_phone: "13800138004",
      created_at: daysAgo(0)
    },
    {
      owner: "王女士",
      title: "豆腐猫砂 6L",
      category: "猫砂清洁",
      price: 18,
      is_free: false,
      condition_level: "全新未拆",
      description: "豆腐猫砂 6L，未拆封。",
      location_area: "梧桐里自提",
      contact_phone: "13800138001",
      created_at: daysAgo(0)
    }
  ].forEach(insertGoods);

  return true;
}
