(function () {
  const API_MODE = window.location.protocol === "http:" && (window.location.port === "8080" || new URLSearchParams(window.location.search).has("api"));
  const API_BASE = "";

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  const defaultFindPets = {
    naigai: {
      name: "奶盖",
      breed: "橘猫 · 短毛",
      age: "女，3岁",
      lostTime: "9.18",
      place: "阳光花园 3 号楼附近",
      appearance: "橘色短毛，尾巴有浅色环纹",
      reward: "提供线索酬谢",
      contactNote: "如有线索请联系主人",
      emoji: "🐱"
    },
    dou: {
      name: "豆豆",
      breed: "柯基",
      age: "男，2岁",
      lostTime: "9.20",
      place: "翠湖公园西门",
      appearance: "黄白色，胸前有白斑",
      reward: "",
      contactNote: "如有线索请及时联系主人",
      emoji: "🐕"
    },
    yunduo: {
      name: "云朵",
      breed: "垂耳兔",
      age: "女，1岁",
      lostTime: "9.19",
      place: "梧桐里小区北门",
      appearance: "白色垂耳，戴浅粉项圈",
      reward: "",
      contactNote: "发现后请先拍照并联系主人",
      emoji: "🐰"
    }
  };

  function getFindPets() {
    const saved = JSON.parse(localStorage.getItem("petHelpFindPets") || "{}");
    return Object.assign({}, defaultFindPets, saved);
  }

  function saveFindPet(form) {
    const record = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (field.name && field.name !== "contact" && field.name !== "contactConsent") {
        record[field.name] = field.value.trim();
      }
    });
    record.id = "pet-" + Date.now();
    record.emoji = "🐾";
    const saved = JSON.parse(localStorage.getItem("petHelpFindPets") || "{}");
    saved[record.id] = record;
    localStorage.setItem("petHelpFindPets", JSON.stringify(saved));
  }

  function collectForm(form) {
    const record = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (field.name && field.name !== "contact" && field.name !== "contactConsent") {
        record[field.name] = field.type === "checkbox" ? field.checked : field.value.trim();
      }
    });
    if (form.hasAttribute("data-save-help")) record.time = record.startAt + " - " + record.endAt;
    if (form.hasAttribute("data-save-goods") && record.isFree) record.price = "0";
    record.id = "item-" + Date.now();
    return record;
  }

  function saveLocalRecord(form, key) {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const record = collectForm(form);
    saved[record.id] = record;
    localStorage.setItem(key, JSON.stringify(saved));
  }

  function renderHelpRecords() {
    const list = document.querySelector("[data-help-list]");
    if (!list) return;
    const saved = JSON.parse(localStorage.getItem("petHelpHelpRecords") || "{}");
    Object.keys(saved).reverse().forEach(function (id) {
      const item = saved[id];
      const article = document.createElement("article");
      article.className = "bg-white rounded-2xl p-4 shadow-sm border border-teal-50";
      article.dataset.postType = "help";
      article.dataset.postId = id;
      article.innerHTML = '<div class="flex gap-3"><div class="w-16 h-16 rounded-2xl placeholder text-2xl shrink-0">🐾</div>' +
        '<div class="min-w-0 flex-1"><div class="flex items-center justify-between"><h2 class="font-semibold">我发布的互助</h2>' +
        '<span class="text-[11px] bg-teal-50 text-sage px-2 py-0.5 rounded-full">待报名</span></div>' +
        '<p class="text-sm text-slate-500 mt-1">宠物类型：' + escapeHTML(item.petType) + (item.petAge ? " · " + escapeHTML(item.petAge) : "") + '</p>' +
        '<p class="text-sm text-slate-500">寄养时间：' + escapeHTML(item.time) + '</p></div></div>' +
        '<p class="text-sm text-slate-600 mt-3">' + escapeHTML(item.desc) + '</p>' +
        '<button data-demo-contact data-post-type="help" data-post-id="' + escapeHTML(id) + '" class="mt-3 w-full py-2.5 rounded-xl bg-mint text-white text-sm font-medium">获取联系方式</button>' +
        '<a href="help-detail.html?id=' + encodeURIComponent(id) + '" class="block mt-2 text-center text-sm text-sage">查看详情</a>';
      list.insertBefore(article, list.firstChild);
    });
  }

  function renderGoodsRecords() {
    const list = document.querySelector("[data-goods-list]");
    if (!list) return;
    const saved = JSON.parse(localStorage.getItem("petHelpGoodsRecords") || "{}");
    Object.keys(saved).reverse().forEach(function (id) {
      const item = saved[id];
      const categoryMap = { "粮食零食": "food", "笼子窝具": "cage", "玩具用品": "toy", "牵引服饰": "wear", "猫砂清洁": "cleaning", "其他用品": "other" };
      const card = document.createElement("a");
      card.href = "goods-detail.html?id=" + encodeURIComponent(id) + "&from=goods";
      card.dataset.category = categoryMap[item.category] || "other";
      card.dataset.postType = "goods";
      card.dataset.postId = id;
      card.className = "bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-50";
      card.innerHTML = '<div class="h-28 placeholder text-3xl">📦</div><div class="p-3"><h2 class="text-sm font-semibold truncate">' + escapeHTML(item.name) +
        '</h2><p class="text-coral font-semibold mt-1">' + (item.isFree ? "免费" : "¥" + escapeHTML(item.price)) + '</p><p class="text-[11px] text-slate-400 mt-1">' + escapeHTML(item.category) +
        " · " + escapeHTML(item.condition) + '</p></div>';
      list.insertBefore(card, list.firstChild);
    });
  }

  function renderHelpRecordsDetail() {
    const detail = document.querySelector("[data-help-detail]");
    if (!detail) return;
    const id = new URLSearchParams(window.location.search).get("id") || "help-lin";
    const saved = JSON.parse(localStorage.getItem("petHelpHelpRecords") || "{}");
    const deleteButton = detail.querySelector("[data-delete-help]");
    if (Object.prototype.hasOwnProperty.call(saved, id)) {
      deleteButton.classList.remove("hidden");
      deleteButton.addEventListener("click", function () {
        const records = JSON.parse(localStorage.getItem("petHelpHelpRecords") || "{}");
        delete records[id];
        localStorage.setItem("petHelpHelpRecords", JSON.stringify(records));
        showToast("互助需求已删除");
        setTimeout(function () { window.location.href = "help-list.html"; }, 500);
      });
    }
    const defaults = {
      "help-lin": { title: "林阿姨", petType: "布偶猫", petAge: "2岁", time: "9.20 - 9.22", place: "阳光花园", desc: "周末出差，希望邻居帮忙喂食铲砂，可提供猫粮与酬谢。" },
      "help-zhou": { title: "小周", petType: "金毛", petAge: "温顺", time: "9.18 晚 - 9.19 午", place: "小区内", desc: "加班到很晚，需要有人帮忙遛一次狗。" },
      "help-chen": { title: "陈同学", petType: "仓鼠", petAge: "", time: "国庆 7 天", place: "待确认", desc: "回家过节，笼子可一起带走，饲料已备好。" }
    };
    const item = saved[id] || defaults[id] || defaults["help-lin"];
    detail.querySelector("[data-help-title]").textContent = item.title + "的互助需求";
    detail.querySelector("[data-help-fields]").innerHTML = "<p>宠物类型：" + escapeHTML(item.petType) + "</p><p>宠物年龄：" + escapeHTML(item.petAge || "未填写") + "</p><p>寄养时间：" + escapeHTML(item.time) + "</p><p>互助地点：" + escapeHTML(item.place) + "</p><p>需求说明：" + escapeHTML(item.desc) + "</p>";
    const contactButton = detail.querySelector("[data-help-contact]");
    contactButton.dataset.demoContact = "";
    contactButton.dataset.postType = "help";
    contactButton.dataset.postId = id;
  }

  function renderGoodsDetail() {
    const detail = document.querySelector("[data-goods-detail]");
    if (!detail) return;
    const id = new URLSearchParams(window.location.search).get("id") || "climbing";
    const saved = JSON.parse(localStorage.getItem("petHelpGoodsRecords") || "{}");
    const deleteButton = detail.querySelector("[data-delete-goods]");
    if (Object.prototype.hasOwnProperty.call(saved, id)) {
      deleteButton.classList.remove("hidden");
      deleteButton.addEventListener("click", function () {
        const records = JSON.parse(localStorage.getItem("petHelpGoodsRecords") || "{}");
        delete records[id];
        localStorage.setItem("petHelpGoodsRecords", JSON.stringify(records));
        showToast("闲置商品已删除");
        setTimeout(function () { window.location.href = "goods-list.html"; }, 500);
      });
    }
    const defaults = {
      climbing: { name: "猫爬架（九成新）", price: "68", category: "玩具用品", condition: "九成新", place: "梧桐里自提", desc: "家中猫咪更喜欢窗台，爬架闲置。主体稳固，绳柱轻微使用痕迹，无破损。", emoji: "🧸" },
      food: { name: "未开封成猫粮 2kg", price: "45", category: "粮食零食", condition: "全新未拆", place: "阳光花园自提", desc: "未开封成猫粮，保存完好。", emoji: "🥫" },
      carrier: { name: "折叠航空箱", price: "80", category: "笼子窝具", condition: "九成新", place: "翠湖公园附近", desc: "折叠便携，适合短途出行。", emoji: "📦" },
      leash: { name: "牵引绳套装", price: "22", category: "牵引服饰", condition: "八成新", place: "梧桐里自提", desc: "牵引绳和胸背套装。", emoji: "🎀" },
      shampoo: { name: "宠物沐浴露余量", price: "12", category: "其他用品", condition: "使用痕迹明显", place: "阳光花园", desc: "宠物沐浴露，剩余约一半。", emoji: "🧴" },
      litter: { name: "豆腐猫砂 6L", price: "18", category: "猫砂清洁", condition: "全新未拆", place: "梧桐里自提", desc: "豆腐猫砂 6L，未拆封。", emoji: "🧻" }
    };
    const item = saved[id] || defaults[id] || defaults.climbing;
    detail.querySelector("[data-goods-image]").textContent = item.emoji || "📦";
    detail.querySelector("[data-goods-title]").textContent = item.name;
    detail.querySelector("[data-goods-price]").textContent = "¥" + item.price;
    detail.querySelector("[data-goods-category]").textContent = item.category;
    detail.querySelector("[data-goods-condition]").textContent = item.condition;
    detail.querySelector("[data-goods-place]").textContent = item.place;
    detail.querySelector("[data-goods-desc]").textContent = item.desc;
  }

  function renderFindPets() {
    const list = document.querySelector("[data-find-list]");
    if (!list) return;
    const fromMine = new URLSearchParams(window.location.search).get("from") === "mine";
    const backLink = document.getElementById("findBackLink");
    if (backLink && fromMine) backLink.href = "mine.html";
    const saved = JSON.parse(localStorage.getItem("petHelpFindPets") || "{}");
    Object.keys(saved).reverse().forEach(function (id) {
      const pet = saved[id];
      const card = document.createElement("a");
      card.href = "find-detail.html?id=" + encodeURIComponent(id) + (fromMine ? "&from=mine" : "");
      card.className = "block bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-50";
      card.dataset.postType = "find";
      card.dataset.postId = id;
      card.innerHTML = '<div class="h-40 placeholder text-4xl">' + escapeHTML(pet.emoji || "🐾") + '</div>' +
        '<div class="p-4"><div class="flex items-start justify-between gap-3"><div>' +
        '<h2 class="font-semibold text-lg">' + escapeHTML(pet.name) + '</h2>' +
        '<p class="text-sm text-slate-500 mt-1">品种：' + escapeHTML(pet.breed) + '</p>' +
        '<p class="text-sm text-slate-500">走失地点：' + escapeHTML(pet.place) + '</p></div>' +
        '<span class="text-[11px] bg-rose-50 text-coral px-2 py-1 rounded-full shrink-0">寻找中</span></div>' +
        '<button data-demo-contact data-post-type="find" data-post-id="' + escapeHTML(id) + '" class="mt-4 w-full py-2.5 rounded-xl bg-mint text-white text-sm font-medium">获取联系方式</button></div>';
      list.insertBefore(card, list.firstChild);
    });
  }

  function renderFindDetail() {
    const detail = document.querySelector("[data-find-detail]");
    if (!detail) return;
    const id = new URLSearchParams(window.location.search).get("id") || "dou";
    const fromMine = new URLSearchParams(window.location.search).get("from") === "mine";
    const backLink = detail.querySelector("[data-find-back]");
    if (backLink && fromMine) backLink.href = "find-pet.html?from=mine";
    const pet = getFindPets()[id] || defaultFindPets.dou;
    const deleteButton = detail.querySelector("[data-delete-find]");
    if (Object.prototype.hasOwnProperty.call(JSON.parse(localStorage.getItem("petHelpFindPets") || "{}"), id)) {
      deleteButton.classList.remove("hidden");
      deleteButton.addEventListener("click", function () {
        const saved = JSON.parse(localStorage.getItem("petHelpFindPets") || "{}");
        delete saved[id];
        localStorage.setItem("petHelpFindPets", JSON.stringify(saved));
        showToast("寻宠启事已删除");
        setTimeout(function () {
          window.location.href = "find-pet.html";
        }, 500);
      });
    }
    detail.querySelector("[data-pet-image]").textContent = pet.emoji || "🐾";
    detail.querySelector("[data-pet-title]").textContent = "急寻！" + pet.name + "走失";
    detail.querySelector("[data-pet-date]").textContent = pet.lostTime || "待补充";
    detail.querySelector("[data-pet-fields]").innerHTML =
      "<p>宠物名称：" + escapeHTML(pet.name) + "</p><p>宠物品种：" + escapeHTML(pet.breed) + "</p><p>性别、年龄：" + escapeHTML(pet.age || "未填写") +
      "</p><p>走失地点：" + escapeHTML(pet.place) + "</p><p>外貌特征：" + escapeHTML(pet.appearance) + "</p><p>悬赏说明：" + escapeHTML(pet.reward || "无") +
      "</p><p>联系说明：" + escapeHTML(pet.contactNote || "无") + "</p>";
    const contactButton = detail.querySelector("[data-contact-button]");
    contactButton.dataset.demoContact = "";
    contactButton.dataset.postType = "find";
    contactButton.dataset.postId = id;
  }

  ["petHelpFindPets", "petHelpHelpRecords", "petHelpGoodsRecords"].forEach(function (key) {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    let changed = false;
    Object.keys(saved).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(saved[id], "contact")) {
        delete saved[id].contact;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(key, JSON.stringify(saved));
  });

  if (!API_MODE) {
  renderFindPets();
  renderFindDetail();
  renderHelpRecords();
  renderGoodsRecords();
  renderHelpRecordsDetail();
  renderGoodsDetail();

  const findSource = new URLSearchParams(window.location.search).get("from");
  if (findSource === "mine") {
    document.querySelectorAll("[data-find-link]").forEach(function (link) {
      const separator = link.href.indexOf("?") === -1 ? "?" : "&";
      link.href += separator + "from=mine";
    });
  }

  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  document.body.appendChild(toastEl);
  let timer;

  window.showToast = function (message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1800);
  };

  document.querySelectorAll("[data-toast]").forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      showToast(el.getAttribute("data-toast"));
    });
  });

  document.addEventListener("click", function (event) {
    const action = event.target.closest("[data-toast]");
    if (!action || action.closest("[data-find-list]") === null) return;
    event.preventDefault();
    event.stopPropagation();
    showToast(action.getAttribute("data-toast"));
  });

  document.querySelectorAll("form[data-success]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (form.hasAttribute("data-save-find")) {
        saveFindPet(form);
      }
      if (form.hasAttribute("data-save-help")) {
        saveLocalRecord(form, "petHelpHelpRecords");
      }
      if (form.hasAttribute("data-save-goods")) {
        saveLocalRecord(form, "petHelpGoodsRecords");
      }
      showToast(form.getAttribute("data-success") || "提交成功");
      form.reset();
      const redirect = form.getAttribute("data-redirect");
      if (redirect) {
        setTimeout(function () {
          window.location.href = redirect;
        }, 500);
      }
    });
  });

  document.querySelectorAll("[data-href]").forEach(function (el) {
    el.addEventListener("click", function () {
      window.location.href = el.getAttribute("data-href");
    });
  });

  const track = document.querySelector(".carousel-track");
  if (track) {
    const slides = track.children;
    const dotsWrap = document.querySelector(".dots");
    let index = 0;

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      if (dotsWrap) {
        Array.prototype.forEach.call(dotsWrap.children, function (dot, di) {
          dot.classList.toggle("active", di === index);
        });
      }
    }

    if (dotsWrap) {
      Array.prototype.forEach.call(dotsWrap.children, function (dot, di) {
        dot.addEventListener("click", function () {
          go(di);
        });
      });
    }

    setInterval(function () {
      go(index + 1);
    }, 3800);
  }

  const filter = document.getElementById("goodsFilter");
  if (filter) {
    filter.addEventListener("change", function () {
      const value = filter.value;
      document.querySelectorAll("[data-category]").forEach(function (card) {
        const match = value === "all" || card.getAttribute("data-category") === value;
        card.style.display = match ? "" : "none";
      });
    });
  }

  document.querySelectorAll("[data-upload]").forEach(function (box) {
    box.addEventListener("click", function () {
      showToast("演示环境：图片上传为占位效果");
    });
  });
  }

  const DEMO_KEYS = {
    find: "petHelpFindPets",
    help: "petHelpHelpRecords",
    goods: "petHelpGoodsRecords"
  };
  const STATUS_KEY = "petHelpPostStatuses";
  const FAVORITE_KEY = "petHelpFavorites";
  const REPORT_KEY = "petHelpReports";
  const CONTACT_KEY = "petHelpContactAttempts";
  const EVENT_KEY = "petHelpDemoEvents";
  const ACCOUNT_KEY = "petHelpDemoAccount";
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  const BLOCKED_TERMS = ["刷单", "刷流水", "高额返利", "私下转账", "保证找回", "辱骂", "身份证号码"];

  function readStore(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (error) { return fallback; }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { showToast("本机存储空间不足，未能保存"); return false; }
  }

  function demoUser() {
    return readStore("petHelpDemoUser", null);
  }

  function trackDemoEvent(name, properties) {
    const events = readStore(EVENT_KEY, []);
    events.push(Object.assign({ event_name: name, event_time: new Date().toISOString(), page_name: location.pathname }, properties || {}));
    writeStore(EVENT_KEY, events.slice(-200));
  }

  function requireDemoLogin() {
    if (demoUser()) return true;
    sessionStorage.setItem("petHelpAfterLogin", location.href);
    trackDemoEvent("login_start", { entry_point: location.pathname });
    location.href = "login.html";
    return false;
  }

  function requireDemoLoginForForm(form) {
    if (demoUser()) return true;
    const draft = {};
    new FormData(form).forEach(function (value, key) {
      if (key !== "contact" && key !== "contactConsent") draft[key] = String(value);
    });
    sessionStorage.setItem("petHelpPendingDraft", JSON.stringify({ form: form.getAttribute("data-save-find") ? "find" : form.hasAttribute("data-save-help") ? "help" : "goods", values: draft }));
    sessionStorage.setItem("petHelpAfterLogin", location.href);
    trackDemoEvent("login_start", { entry_point: location.pathname });
    location.href = "login.html";
    return false;
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  }

  function postStatus(type, id) {
    const statuses = readStore(STATUS_KEY, {});
    const item = statuses[type + ":" + id];
    if (item) return item.status;
    if (type === "help" && id === "help-chen") return "closed";
    return "active";
  }

  function setPostStatus(type, id, status) {
    const statuses = readStore(STATUS_KEY, {});
    const key = type + ":" + id;
    const previous = statuses[key] ? statuses[key].status : "active";
    statuses[key] = { status: status, changedAt: Date.now() };
    writeStore(STATUS_KEY, statuses);
    trackDemoEvent("post_status_change", { post_type: type, from_status: previous, to_status: status, change_source: "demo_user" });
    applyPostStatuses();
    refreshDetailActions();
    refreshMineSummary();
  }

  function getPostTypeId(element) {
    const directType = element.dataset.postType || element.dataset.type;
    const directId = element.dataset.postId || element.dataset.id;
    if (directType && directId) return { type: directType, id: directId };
    const anchor = element.closest('a[href*="find-detail.html"],a[href*="help-detail.html"],a[href*="goods-detail.html"]');
    if (!anchor) return null;
    const url = new URL(anchor.href, location.href);
    return {
      type: url.pathname.indexOf("find-detail") >= 0 ? "find" : url.pathname.indexOf("help-detail") >= 0 ? "help" : "goods",
      id: url.searchParams.get("id") || ""
    };
  }

  function applyPostStatuses() {
    const statuses = readStore(STATUS_KEY, {});
    const expiry = readStore("petHelpPostExpiry", {});
    Object.keys(expiry).forEach(function (key) {
      if (expiry[key] <= Date.now() && (!statuses[key] || statuses[key].status === "active")) {
        statuses[key] = { status: "expired", changedAt: Date.now() };
        trackDemoEvent("post_status_change", { post_type: key.split(":")[0], from_status: "active", to_status: "expired", change_source: "auto" });
      }
    });
    writeStore(STATUS_KEY, statuses);
    document.querySelectorAll('a[href*="find-detail.html"],a[href*="help-detail.html"],a[href*="goods-detail.html"],[data-help-id]').forEach(function (card) {
      const info = getPostTypeId(card);
      if (!info || !info.id) return;
      const status = statuses[info.type + ":" + info.id]?.status || "active";
      const mineView = new URLSearchParams(location.search).get("from") === "mine";
      const displayCard = card.closest("[data-help-id]") || card.closest("article") || card;
      displayCard.classList.toggle("hidden", !mineView && status !== "active");
      displayCard.dataset.postType = info.type;
      displayCard.dataset.postId = info.id;
      displayCard.dataset.postStatus = status;
      const contact = displayCard.querySelector("[data-demo-contact]");
      if (contact) {
        contact.disabled = status !== "active";
        if (status !== "active") contact.textContent = "不可联系 · " + status;
      }
    });
  }

  function createActionButton(label, attrs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "px-3 py-2 rounded-xl border border-orange-100 text-sm";
    button.textContent = label;
    Object.keys(attrs).forEach(function (key) { button.setAttribute(key, attrs[key]); });
    return button;
  }

  function showDemoDialog(title, message, options, onConfirm, confirmLabel) {
    const overlay = document.createElement("div");
    overlay.className = "demo-dialog-overlay";
    overlay.setAttribute("role", "presentation");
    const panel = document.createElement("section");
    panel.className = "demo-dialog-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    const heading = document.createElement("h2");
    heading.className = "text-lg font-semibold";
    heading.textContent = title;
    const description = document.createElement("p");
    description.className = "text-sm text-slate-600 mt-2 leading-6";
    description.textContent = message;
    panel.append(heading, description);
    let select;
    if (options && options.length) {
      select = document.createElement("select");
      select.className = "mt-4 w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm";
      options.forEach(function (option, index) {
        const element = document.createElement("option");
        element.value = option;
        element.textContent = option;
        if (index === 0) element.selected = true;
        select.appendChild(element);
      });
      panel.appendChild(select);
    }
    const buttons = document.createElement("div");
    buttons.className = "mt-5 flex justify-end gap-2";
    const cancel = createActionButton("取消", {});
    const confirm = createActionButton(confirmLabel || "确认", {});
    confirm.className = "demo-dialog-confirm px-4 py-2 rounded-xl text-sm";
    cancel.addEventListener("click", function () { overlay.remove(); });
    confirm.addEventListener("click", function () {
      const value = select ? select.value : true;
      overlay.remove();
      onConfirm(value);
    });
    buttons.append(cancel, confirm);
    panel.appendChild(buttons);
    overlay.appendChild(panel);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    if (select) select.focus();
    else confirm.focus();
  }

  function refreshDetailActions() {
    const root = document.querySelector("[data-find-detail],[data-help-detail],[data-goods-detail]");
    if (!root) return;
    const type = root.hasAttribute("data-find-detail") ? "find" : root.hasAttribute("data-help-detail") ? "help" : "goods";
    const id = new URLSearchParams(location.search).get("id") || (type === "find" ? "dou" : type === "help" ? "help-lin" : "climbing");
    const status = postStatus(type, id);
    const contact = root.querySelector("[data-contact-button],[data-help-contact]");
    if (contact) {
      contact.removeAttribute("data-toast");
      contact.textContent = status === "active" ? "获取联系方式" : "内容已失效，暂不可联系";
      contact.dataset.demoContact = "true";
      contact.dataset.postType = type;
      contact.dataset.postId = id;
      contact.disabled = status !== "active";
    }
    const statusBadge = root.querySelector("[data-post-status]");
    if (statusBadge) statusBadge.textContent = type === "find" && status === "active" ? "寻找中" : status === "active" ? "有效" : status;
    const oldActions = root.querySelector("[data-demo-actions]");
    if (oldActions) oldActions.remove();
    const actions = document.createElement("div");
    actions.dataset.demoActions = "";
    actions.className = "px-5 mt-3 flex flex-wrap gap-2";
    actions.appendChild(createActionButton("收藏", { "data-demo-favorite": "", "data-post-type": type, "data-post-id": id }));
    if (status === "active") actions.appendChild(createActionButton("举报", { "data-demo-report": "", "data-post-type": type, "data-post-id": id }));
    const user = demoUser();
    const record = readStore(DEMO_KEYS[type], {})[id];
    if (user && record && record.owner === user.id) {
      if (status === "active" && type === "find") actions.appendChild(createActionButton("已寻回", { "data-demo-status": "resolved", "data-post-type": type, "data-post-id": id }));
      if (status === "active" && type !== "find") actions.appendChild(createActionButton("下架/完成", { "data-demo-status": "closed", "data-post-type": type, "data-post-id": id }));
      if (status === "active") actions.appendChild(createActionButton("删除", { "data-demo-status": "deleted", "data-post-type": type, "data-post-id": id }));
      if (["resolved", "closed", "deleted"].indexOf(status) >= 0) actions.appendChild(createActionButton("撤销状态", { "data-demo-undo": "", "data-post-type": type, "data-post-id": id }));
    }
    root.appendChild(actions);
  }

  function contactDemo(type, id) {
    if (!requireDemoLogin()) return;
    if (readStore(ACCOUNT_KEY, {}).status === "banned") { showToast("本机演示账号已被限制联系"); return; }
    if (postStatus(type, id) !== "active") { showToast("该内容已失效，无法联系"); return; }
    const attempts = readStore(CONTACT_KEY, []).filter(function (item) { return item.time > Date.now() - HOUR; });
    if (attempts.filter(function (item) { return item.type === type && item.id === id; }).length >= 3 || attempts.length >= 10) {
      writeStore(CONTACT_KEY, attempts);
      trackDemoEvent("contact_flow", { post_type: type, stage: "blocked", result: "rate_limited" });
      showToast("联系次数已达本机演示上限，请稍后再试");
      return;
    }
    trackDemoEvent("contact_flow", { post_type: type, stage: "confirm", result: "shown" });
    showDemoDialog("获取联系方式", "本操作仅演示联系流程，不会展示或保存手机号，也不会发起真实拨号。", null, function () {
      attempts.push({ type: type, id: id, time: Date.now() });
      writeStore(CONTACT_KEY, attempts);
      trackDemoEvent("contact_flow", { post_type: type, stage: "contact", result: "demo_only" });
      showToast("已记录本机演示联系次数；未拨号");
    }, "继续");
  }

  function toggleFavorite(type, id) {
    if (!requireDemoLogin()) return;
    if (readStore(ACCOUNT_KEY, {}).status === "banned") { showToast("本机演示账号已被限制收藏"); return; }
    if (postStatus(type, id) !== "active") { showToast("仅可收藏有效内容"); return; }
    const favorites = readStore(FAVORITE_KEY, []);
    const index = favorites.findIndex(function (item) { return item.type === type && item.id === id; });
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push({ type: type, id: id, createdAt: Date.now() });
    writeStore(FAVORITE_KEY, favorites);
    trackDemoEvent("favorite_change", { post_type: type, action: index >= 0 ? "remove" : "add" });
    showToast(index >= 0 ? "已取消收藏" : "已加入收藏");
    renderFavoritesDemo();
    refreshDetailActions();
    refreshMineSummary();
  }

  function reportDemo(type, id) {
    if (!requireDemoLogin()) return;
    const reports = readStore(REPORT_KEY, []);
    const user = demoUser();
    if (reports.some(function (item) { return item.type === type && item.id === id && item.reporter === user.id; })) {
      showToast("你已提交过这条内容的举报");
      return;
    }
    showDemoDialog("举报内容", "请选择最符合的原因。举报只记入本机演示，不会发送给平台。", ["虚假信息", "骚扰/诈骗", "违规内容", "隐私泄露", "其他"], function (reason) {
      reports.push({ type: type, id: id, reporter: user.id, reason: reason, status: "待处理", createdAt: Date.now() });
      writeStore(REPORT_KEY, reports);
      trackDemoEvent("report_submit", { post_type: type, reason_category: reason });
      showToast("举报已记入本机演示");
      renderModerationDemo();
    }, "提交举报");
  }

  function changeDemoStatus(type, id, status) {
    if (!requireDemoLogin()) return;
    const records = readStore(DEMO_KEYS[type], {});
    const record = records[id];
    const user = demoUser();
    if (!record || !user || record.owner !== user.id) { showToast("仅可管理本机演示账号发布的内容"); return; }
    const prompt = status === "deleted" ? "删除后将从公开列表移除，24 小时内可撤销。" : status === "resolved" ? "确认宠物已寻回？这条启事将退出公开列表。" : "确认更新这条帖子的状态？";
    showDemoDialog("确认操作", prompt, null, function () {
      setPostStatus(type, id, status);
      showToast("本机演示状态已更新");
    }, "确认");
  }

  function renderFavoritesDemo() {
    const list = document.querySelector("[data-favorites-list]");
    if (!list) return;
    list.replaceChildren();
    const filter = document.querySelector("[data-favorite-filter].active")?.dataset.favoriteFilter || "all";
    const favorites = readStore(FAVORITE_KEY, []).filter(function (item) { return filter === "all" || item.type === filter; });
    if (!favorites.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500 bg-white rounded-xl p-4";
      empty.textContent = "暂无收藏。收藏内容仅保存在此浏览器。";
      list.appendChild(empty);
      return;
    }
    favorites.slice().reverse().forEach(function (item) {
      const record = readStore(DEMO_KEYS[item.type], {})[item.id];
      const seedTitles = { "find:naigai": "奶盖 · 寻找中", "find:dou": "豆豆 · 寻找中", "find:yunduo": "云朵 · 寻找中", "help:help-lin": "林阿姨的互助需求", "help:help-zhou": "小周的互助需求", "help:help-chen": "陈同学的互助需求", "goods:climbing": "猫爬架（九成新）", "goods:food": "未开封成猫粮 2kg", "goods:carrier": "折叠航空箱", "goods:leash": "牵引绳套装", "goods:shampoo": "宠物沐浴露余量", "goods:litter": "豆腐猫砂 6L" };
      const row = document.createElement("article");
      row.className = "bg-white rounded-2xl p-3 border border-orange-50";
      const title = record ? (record.name || record.title || record.petType || "本机演示内容") : (seedTitles[item.type + ":" + item.id] || typeName(item.type) + "演示内容");
      const text = document.createElement("p");
      text.className = "text-sm font-medium";
      text.textContent = title + (postStatus(item.type, item.id) === "active" ? "" : " · " + postStatus(item.type, item.id));
      row.appendChild(text);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mt-2 text-sm text-coral";
      remove.textContent = "取消收藏";
      remove.addEventListener("click", function () { toggleFavorite(item.type, item.id); });
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  function refreshMineSummary() {
    const postCount = document.querySelector("[data-mine-post-count]");
    const favoriteCount = document.querySelector("[data-mine-favorite-count]");
    const user = demoUser();
    if (postCount) {
      const count = Object.keys(DEMO_KEYS).reduce(function (sum, type) {
        const records = readStore(DEMO_KEYS[type], {});
        return sum + Object.keys(records).filter(function (id) { return records[id].owner === (user && user.id); }).length;
      }, 0);
      postCount.textContent = String(count);
    }
    if (favoriteCount) favoriteCount.textContent = String(readStore(FAVORITE_KEY, []).length);
    const name = document.querySelector("[data-demo-user-name]");
    const auth = document.querySelector("[data-demo-user-auth]");
    if (name) name.textContent = user ? "本机演示用户" : "访客模式";
    if (auth) auth.textContent = "未实名认证 · 不连接微信";
    const logout = document.querySelector("[data-demo-logout]");
    if (logout) logout.textContent = user ? "退出本机演示账号" : "进入本机演示账号";
    renderMinePosts();
    renderModerationDemo();
  }

  function renderMinePosts() {
    const list = document.querySelector("[data-mine-post-list]");
    if (!list) return;
    list.replaceChildren();
    const user = demoUser();
    if (!user) {
      const hint = document.createElement("p");
      hint.className = "text-sm text-slate-500";
      hint.textContent = "进入本机演示账号后，可查看此浏览器内创建的帖子。";
      list.appendChild(hint);
      return;
    }
    const records = [];
    Object.keys(DEMO_KEYS).forEach(function (type) {
      const bucket = readStore(DEMO_KEYS[type], {});
      Object.keys(bucket).forEach(function (id) {
        const record = bucket[id];
        if (record.owner === user.id) records.push({ type: type, id: id, record: record, status: postStatus(type, id) });
      });
    });
    records.sort(function (a, b) { return (b.record.createdAt || 0) - (a.record.createdAt || 0); });
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500";
      empty.textContent = "暂无本机演示发布内容";
      list.appendChild(empty);
      return;
    }
    records.forEach(function (item) {
      const row = document.createElement("div");
      row.className = "border-t border-orange-100 pt-3 first:border-0 first:pt-0";
      const link = document.createElement("a");
      link.className = "text-sm font-medium text-sage";
      link.href = (item.type === "find" ? "find-detail.html" : item.type === "help" ? "help-detail.html" : "goods-detail.html") + "?id=" + encodeURIComponent(item.id) + "&from=mine";
      link.textContent = (item.record.name || item.record.title || item.record.petType || "我的发布") + " · " + (item.status === "active" ? "有效" : item.status);
      row.appendChild(link);
      if (item.status === "deleted" && Date.now() - (readStore(STATUS_KEY, {})[item.type + ":" + item.id]?.changedAt || 0) <= DAY) {
        const undo = document.createElement("button");
        undo.type = "button";
        undo.className = "ml-3 text-xs text-coral";
        undo.textContent = "撤销删除";
        undo.dataset.demoUndo = "";
        undo.dataset.postType = item.type;
        undo.dataset.postId = item.id;
        row.appendChild(undo);
      }
      list.appendChild(row);
    });
  }

  function renderModerationDemo() {
    const panel = document.querySelector("[data-demo-reports]");
    if (!panel) return;
    panel.replaceChildren();
    const reports = readStore(REPORT_KEY, []);
    if (!reports.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500";
      empty.textContent = "暂无本机演示举报记录";
      panel.appendChild(empty);
      return;
    }
    reports.slice().reverse().forEach(function (report, index) {
      const row = document.createElement("div");
      row.className = "border-t border-orange-100 py-3";
      const label = document.createElement("p");
      label.className = "text-sm";
      label.textContent = report.type + " · " + report.reason + " · " + report.status;
      row.appendChild(label);
      if (report.status === "待处理") {
        const actions = [["维持可见", "keep"], ["下架帖子", "remove"], ["警告", "warn"], ["限制发布", "restrict"], ["封禁演示账号", "ban"]];
        actions.forEach(function (action) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mt-2 mr-2 px-2 py-1 border border-slate-200 rounded-lg text-xs";
          button.textContent = action[0];
          button.dataset.reportAction = action[1];
          button.dataset.reportIndex = String(reports.length - 1 - index);
          row.appendChild(button);
        });
      }
      panel.appendChild(row);
    });
  }

  function moderationAction(index, action) {
    const reports = readStore(REPORT_KEY, []);
    const report = reports[index];
    if (!report) return;
    if (action === "remove") setPostStatus(report.type, report.id, "removed");
    if (action === "warn") {
      const account = readStore(ACCOUNT_KEY, { strikes: 0, status: "normal" });
      account.strikes = (account.strikes || 0) + 1;
      if (account.strikes >= 2) { account.status = "restricted"; account.restrictionUntil = Date.now() + DAY; }
      writeStore(ACCOUNT_KEY, account);
    }
    if (action === "restrict" || action === "ban") {
      const account = readStore(ACCOUNT_KEY, {});
      account.status = action === "ban" ? "banned" : "restricted";
      account.restrictionUntil = action === "ban" ? 0 : Date.now() + DAY;
      writeStore(ACCOUNT_KEY, account);
    }
    report.status = action === "keep" ? "未违规" : "已处理：" + action;
    writeStore(REPORT_KEY, reports);
    trackDemoEvent("report_handled", { post_type: report.type, handling_result: action });
    showToast("处置结果已记入本机演示");
    renderModerationDemo();
    applyPostStatuses();
  }

  function handleDemoForm(form) {
    const type = form.hasAttribute("data-save-find") ? "find" : form.hasAttribute("data-save-help") ? "help" : "goods";
    if (!requireDemoLoginForForm(form)) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const account = readStore(ACCOUNT_KEY, { status: "normal" });
    if (account.status === "banned" || (account.status === "restricted" && account.restrictionUntil > Date.now())) {
      showToast(account.status === "banned" ? "本机演示账号已被限制发布" : "发布暂受限制，请稍后再试");
      return;
    }
    const data = {};
    new FormData(form).forEach(function (value, key) { data[key] = String(value).trim(); });
    const consent = form.querySelector("[name=contactConsent]");
    if (consent && !consent.checked) { showToast("请确认联系方式用途"); return; }
    const content = Object.keys(data).filter(function (key) { return key !== "contact" && key !== "contactConsent"; }).map(function (key) { return data[key]; }).join(" ");
    if (BLOCKED_TERMS.some(function (term) { return normalizeText(content).includes(normalizeText(term)); })) {
      trackDemoEvent("keyword_filter_result", { post_type: type, category: "blocked_term", result: "blocked" });
      showToast("内容包含不适宜信息，请修改后重试");
      return;
    }
    const records = readStore(DEMO_KEYS[type], {});
    const title = normalizeText(data.name || data.petType || data.title);
    const duplicate = Object.keys(records).some(function (id) {
      const item = records[id];
      return item.owner === demoUser().id && item.status !== "deleted" && item.createdAt > Date.now() - 10 * 60 * 1000 && normalizeText(item.name || item.petType || item.title) === title;
    });
    if (duplicate) {
      trackDemoEvent("duplicate_post_detected", { post_type: type, action: "blocked" });
      showToast("检测到相似发布，请编辑原内容或稍后再发");
      return;
    }
    const todayCount = Object.keys(records).filter(function (id) { return records[id].owner === demoUser().id && records[id].createdAt > Date.now() - DAY; }).length;
    if (todayCount >= 3) {
      trackDemoEvent("duplicate_post_detected", { post_type: type, action: "cooldown" });
      showToast("本机演示账号今日发布次数已达上限");
      return;
    }
    const id = "demo-" + Date.now();
    const record = Object.assign({}, data, { id: id, owner: demoUser().id, status: "active", createdAt: Date.now(), expiresAt: Date.now() + (type === "help" ? 7 : 30) * DAY, emoji: type === "find" ? "🐾" : type === "help" ? "🐾" : "📦" });
    delete record.contact;
    delete record.contactConsent;
    records[id] = record;
    if (!writeStore(DEMO_KEYS[type], records)) return;
    const expiry = readStore("petHelpPostExpiry", {});
    expiry[type + ":" + id] = record.expiresAt;
    writeStore("petHelpPostExpiry", expiry);
    trackDemoEvent("publish_result", { post_type: type, result: "success" });
    showToast("已保存在此浏览器；联系方式未保存，勿填真实信息");
    form.reset();
    const redirect = form.getAttribute("data-redirect");
    if (redirect) setTimeout(function () { location.href = redirect; }, 450);
  }

  function bindDemoInteractions() {
    const shell = document.querySelector(".app-shell");
    if (shell && !shell.querySelector("[data-demo-banner]")) {
      const banner = document.createElement("p");
      banner.dataset.demoBanner = "";
      banner.className = "mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 text-xs text-slate-600";
      banner.textContent = "静态交互演示：数据仅保存在此浏览器，不连接微信或服务端；请勿填写真实手机号及个人信息。";
      shell.insertBefore(banner, shell.firstChild);
    }

    document.addEventListener("click", function (event) {
      const target = event.target.closest("button,a");
      if (!target) return;
      if (target.hasAttribute("data-href") && location.pathname.endsWith("login.html")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        writeStore("petHelpDemoUser", { id: "demo-local-user", createdAt: Date.now() });
        trackDemoEvent("login_result", { result: "demo_only" });
        const destination = sessionStorage.getItem("petHelpAfterLogin") || "mine.html";
        sessionStorage.removeItem("petHelpAfterLogin");
        location.href = destination;
        return;
      }
      const info = getPostTypeId(target);
      if (target.hasAttribute("data-demo-contact")) {
        event.preventDefault(); event.stopImmediatePropagation();
        const type = target.dataset.postType || (info && info.type) || (typeFromPathForDemo());
        const id = target.dataset.postId || (info && info.id) || new URLSearchParams(location.search).get("id");
        if (type && id) contactDemo(type, id);
        else showToast("此演示内容没有可用的联系入口");
        return;
      }
      if (target.hasAttribute("data-demo-favorite")) {
        event.preventDefault(); event.stopImmediatePropagation();
        toggleFavorite(target.dataset.postType, target.dataset.postId); return;
      }
      if (target.hasAttribute("data-demo-report")) {
        event.preventDefault(); event.stopImmediatePropagation();
        reportDemo(target.dataset.postType, target.dataset.postId); return;
      }
      if (target.hasAttribute("data-demo-status")) {
        event.preventDefault(); event.stopImmediatePropagation();
        changeDemoStatus(target.dataset.postType, target.dataset.postId, target.dataset.demoStatus); return;
      }
      if (target.hasAttribute("data-demo-undo")) {
        event.preventDefault(); event.stopImmediatePropagation();
        const type = target.dataset.postType;
        const id = target.dataset.postId;
        const key = type + ":" + id;
        const statuses = readStore(STATUS_KEY, {});
        const changed = statuses[key] && statuses[key].changedAt;
        if (!changed || Date.now() - changed > DAY) { showToast("撤销期限已过"); return; }
        setPostStatus(type, id, "active");
        showToast("已恢复本机演示状态");
        return;
      }
      if (target.hasAttribute("data-favorite-filter")) {
        event.preventDefault(); event.stopImmediatePropagation();
        document.querySelectorAll("[data-favorite-filter]").forEach(function (button) {
          const active = button === target;
          button.classList.toggle("active", active);
          button.classList.toggle("bg-peach", active);
          button.classList.toggle("text-white", active);
        });
        renderFavoritesDemo(); return;
      }
      if (target.hasAttribute("data-toast") && /联系|报名|私信/.test(target.textContent || "")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (info) contactDemo(info.type, info.id);
        else showToast("静态演示不会发送联系请求");
        return;
      }
      if (target.hasAttribute("data-demo-contact")) {
        event.preventDefault(); event.stopImmediatePropagation();
        contactDemo(target.dataset.postType, target.dataset.postId); return;
      }
      if (target.hasAttribute("data-demo-favorite")) {
        event.preventDefault(); event.stopImmediatePropagation();
        toggleFavorite(target.dataset.postType, target.dataset.postId); return;
      }
      if (target.hasAttribute("data-demo-report")) {
        event.preventDefault(); event.stopImmediatePropagation();
        reportDemo(target.dataset.postType, target.dataset.postId); return;
      }
      if (target.hasAttribute("data-demo-status")) {
        event.preventDefault(); event.stopImmediatePropagation();
        changeDemoStatus(target.dataset.postType, target.dataset.postId, target.dataset.demoStatus); return;
      }
      if (target.hasAttribute("data-report-action")) {
        event.preventDefault(); event.stopImmediatePropagation();
        moderationAction(Number(target.dataset.reportIndex), target.dataset.reportAction); return;
      }
      if (target.hasAttribute("data-delete-find") || target.hasAttribute("data-delete-help") || target.hasAttribute("data-delete-goods")) {
        event.preventDefault(); event.stopImmediatePropagation();
        const type = target.hasAttribute("data-delete-find") ? "find" : target.hasAttribute("data-delete-help") ? "help" : "goods";
        const id = new URLSearchParams(location.search).get("id");
        if (id) changeDemoStatus(type, id, "deleted");
        return;
      }
      if (target.hasAttribute("data-demo-logout")) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (demoUser()) {
          localStorage.removeItem("petHelpDemoUser");
          showToast("已退出本机演示账号");
        } else {
          writeStore("petHelpDemoUser", { id: "demo-local-user", createdAt: Date.now() });
          trackDemoEvent("login_result", { result: "demo_only" });
          showToast("已进入本机演示账号（非微信登录）");
        }
        setTimeout(function () { location.reload(); }, 300);
      }
    }, true);

    document.addEventListener("submit", function (event) {
      const form = event.target;
      if (!form.matches("form[data-save-find],form[data-save-help],form[data-save-goods]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleDemoForm(form);
    }, true);

    document.querySelectorAll("[data-find-list] a[data-find-link]").forEach(function (card) {
      const id = new URL(card.href, location.href).searchParams.get("id");
      card.dataset.postType = "find"; card.dataset.postId = id;
      const button = card.querySelector("button[data-toast]");
      if (button) { button.removeAttribute("data-toast"); button.dataset.demoContact = "true"; button.dataset.postType = "find"; button.dataset.postId = id; button.textContent = "获取联系方式"; }
    });
    document.querySelectorAll("[data-help-id]").forEach(function (card) {
      card.dataset.postType = "help"; card.dataset.postId = card.dataset.helpId;
      const button = card.querySelector("button[data-toast]");
      if (button) { button.removeAttribute("data-toast"); button.dataset.demoContact = "true"; button.dataset.postType = "help"; button.dataset.postId = card.dataset.helpId; button.textContent = "获取联系方式"; }
    });
    document.querySelectorAll("[data-goods-list] a[href*='goods-detail']").forEach(function (card) {
      const id = new URL(card.href, location.href).searchParams.get("id");
      card.dataset.postType = "goods"; card.dataset.postId = id;
    });
    document.querySelectorAll("form[data-save-find],form[data-save-help],form[data-save-goods]").forEach(function (form) {
      const phone = form.querySelector("[name=contact]");
      if (phone) { phone.autocomplete = "off"; phone.placeholder = "演示联系方式（不会保存）"; }
    });
    let pendingDraft = null;
    try { pendingDraft = JSON.parse(sessionStorage.getItem("petHelpPendingDraft") || "null"); } catch (error) { pendingDraft = null; }
    if (pendingDraft) {
      const form = document.querySelector(pendingDraft.form === "find" ? "form[data-save-find]" : pendingDraft.form === "help" ? "form[data-save-help]" : "form[data-save-goods]");
      if (form) {
        Object.keys(pendingDraft.values).forEach(function (name) {
          const field = form.elements.namedItem(name);
          if (field) field.value = pendingDraft.values[name];
        });
        sessionStorage.removeItem("petHelpPendingDraft");
        showToast("已恢复未提交内容；请重新填写演示联系方式并确认用途");
      }
    }
    ["find", "help", "goods"].forEach(function (type) {
      const records = readStore(DEMO_KEYS[type], {});
      let changed = false;
      Object.keys(records).forEach(function (id) {
        if (Object.prototype.hasOwnProperty.call(records[id], "contact")) {
          delete records[id].contact;
          changed = true;
        }
      });
      if (changed) writeStore(DEMO_KEYS[type], records);
    });
    applyPostStatuses();
    refreshDetailActions();
    renderFavoritesDemo();
    refreshMineSummary();
  }

  function apiToken() { return sessionStorage.getItem("petHelpApiToken") || ""; }

  async function apiRequest(path, options) {
    const settings = options || {};
    const headers = Object.assign({ Accept: "application/json" }, settings.headers || {});
    if (settings.body !== undefined) headers["Content-Type"] = "application/json";
    if (apiToken()) headers.Authorization = "Bearer " + apiToken();
    let response;
    try {
      response = await fetch(API_BASE + path, {
        method: settings.method || "GET",
        headers: headers,
        body: settings.body === undefined ? undefined : JSON.stringify(settings.body)
      });
    } catch (error) {
      throw new Error("无法连接本机 API；请确认 npm start 正在运行。");
    }
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      if (response.status === 401 && path !== "/api/v1/auth/demo" && path !== "/api/v1/auth/wechat") sessionStorage.removeItem("petHelpApiToken");
      throw new Error(payload.error?.message || "请求失败，请稍后重试");
    }
    return payload;
  }

  function apiToast(message) {
    const toast = document.querySelector(".toast") || (function () {
      const node = document.createElement("div");
      node.className = "toast";
      document.body.appendChild(node);
      return node;
    })();
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(apiToast.timer);
    apiToast.timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  function apiTrack(eventName, properties) {
    const event = { event_id: window.crypto?.randomUUID ? window.crypto.randomUUID() : "evt-" + Date.now() + "-" + Math.random().toString(16).slice(2), event_name: eventName, properties: properties || {} };
    fetch(API_BASE + "/api/v1/events", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, apiToken() ? { Authorization: "Bearer " + apiToken() } : {}),
      body: JSON.stringify(event),
      keepalive: true
    }).catch(function () {});
  }

  function apiShowDialog(title, message, options, onConfirm, confirmLabel) {
    const overlay = document.createElement("div");
    overlay.className = "demo-dialog-overlay";
    overlay.setAttribute("role", "presentation");
    const panel = document.createElement("section");
    panel.className = "demo-dialog-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    const heading = document.createElement("h2");
    heading.className = "text-lg font-semibold";
    heading.textContent = title;
    const description = document.createElement("p");
    description.className = "text-sm text-slate-600 mt-2 leading-6";
    description.textContent = message;
    panel.append(heading, description);
    let select;
    if (options && options.length) {
      select = document.createElement("select");
      select.className = "mt-4 w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm";
      options.forEach(function (item) {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        select.appendChild(option);
      });
      panel.appendChild(select);
    }
    const buttons = document.createElement("div");
    buttons.className = "mt-5 flex justify-end gap-2";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "px-4 py-2 rounded-xl border border-orange-100 text-sm";
    cancel.textContent = "取消";
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "demo-dialog-confirm px-4 py-2 rounded-xl text-sm";
    confirm.textContent = confirmLabel || "确认";
    cancel.addEventListener("click", function () { overlay.remove(); });
    confirm.addEventListener("click", function () {
      overlay.remove();
      onConfirm(select ? select.value : true);
    });
    buttons.append(cancel, confirm);
    panel.appendChild(buttons);
    overlay.appendChild(panel);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    if (select) select.focus(); else confirm.focus();
  }

  function apiPostTypeFromPage() {
    if (document.querySelector("[data-find-detail]")) return "find";
    if (document.querySelector("[data-help-detail]")) return "help";
    if (document.querySelector("[data-goods-detail]")) return "goods";
    const path = window.location.pathname;
    if (path.endsWith("find-pet.html")) return "find";
    if (path.endsWith("help-list.html")) return "help";
    if (path.endsWith("goods-list.html")) return "goods";
    return null;
  }

  function apiDetailHref(type, postId) {
    return (type === "find" ? "find-detail.html" : type === "help" ? "help-detail.html" : "goods-detail.html") + "?id=" + encodeURIComponent(postId);
  }

  function apiPostTitle(post) {
    if (post.post_type === "find") return post.pet_name;
    if (post.post_type === "help") return post.pet_type + " · " + post.help_type;
    return post.title;
  }

  const apiFavorites = new Set();
  const apiCategorySlugs = { food: "粮食零食", cage: "笼子窝具", toy: "玩具用品", wear: "牵引服饰", cleaning: "猫砂清洁", other: "其他用品" };

  function apiFavoriteKey(type, postId) { return type + ":" + postId; }

  async function apiLoadFavorites() {
    if (!apiToken()) return;
    const payload = await apiRequest("/api/v1/me/favorites");
    apiFavorites.clear();
    payload.items.forEach(function (post) { apiFavorites.add(apiFavoriteKey(post.post_type, post.id)); });
  }

  function apiStatusLabel(status) {
    return ({ active: "有效", expired: "已过期", resolved: "已寻回", closed: "已下架/完成", removed: "已移除", deleted: "已删除" })[status] || status;
  }

  function apiCreateCard(post, ownerId) {
    const article = document.createElement("article");
    article.className = "bg-white rounded-2xl p-4 shadow-sm border border-orange-50";
    if (post.post_type === "goods") article.dataset.category = post.category;
    const link = document.createElement("a");
    link.className = "flex items-start justify-between gap-3 text-inherit no-underline";
    link.href = apiDetailHref(post.post_type, post.id);
    const content = document.createElement("div");
    content.className = "min-w-0 flex-1";
    const title = document.createElement("h2");
    title.className = "font-semibold";
    title.textContent = apiPostTitle(post);
    content.appendChild(title);
    const fields = post.post_type === "find" ? [post.breed, post.lost_location, post.lost_at] : post.post_type === "help" ? [post.location_area, post.start_at, post.end_at] : [post.category, post.is_free ? "免费" : "¥" + post.price, post.location_area];
    fields.filter(Boolean).forEach(function (value) {
      const line = document.createElement("p");
      line.className = "text-sm text-slate-500 mt-1";
      line.textContent = value;
      content.appendChild(line);
    });
    const badge = document.createElement("span");
    badge.className = "text-[11px] bg-teal-50 text-sage px-2 py-1 rounded-full shrink-0";
    badge.textContent = apiStatusLabel(post.status);
    link.append(content, badge);
    article.appendChild(link);
    if (post.description) {
      const description = document.createElement("p");
      description.className = "text-sm text-slate-600 mt-3";
      description.textContent = post.description;
      article.appendChild(description);
    }
    const actions = document.createElement("div");
    actions.className = "mt-3 flex gap-2";
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "px-3 py-2 rounded-xl border border-orange-100 text-sm";
    favorite.textContent = apiFavorites.has(apiFavoriteKey(post.post_type, post.id)) ? "已收藏" : "收藏";
    favorite.dataset.apiAction = "favorite";
    favorite.dataset.postType = post.post_type;
    favorite.dataset.postId = post.id;
    actions.appendChild(favorite);
    if (post.status === "active" && ownerId !== post.owner?.id) {
      const contact = document.createElement("button");
      contact.type = "button";
      contact.className = "flex-1 py-2 rounded-xl bg-mint text-white text-sm";
      contact.textContent = "获取联系方式";
      contact.dataset.apiAction = "contact";
      contact.dataset.postType = post.post_type;
      contact.dataset.postId = post.id;
      actions.appendChild(contact);
    }
    article.appendChild(actions);
    return article;
  }

  async function apiRequireLogin(form) {
    if (apiToken()) return true;
    if (form) {
      const values = {};
      new FormData(form).forEach(function (value, key) {
        if (key !== "contact" && key !== "contactConsent") values[key] = String(value);
      });
      const type = form.hasAttribute("data-save-find") ? "find" : form.hasAttribute("data-save-help") ? "help" : "goods";
      sessionStorage.setItem("petHelpApiPendingDraft", JSON.stringify({ type: type, values: values }));
    }
    sessionStorage.setItem("petHelpApiReturnTo", window.location.href);
    apiTrack("login_start", { entry_point: window.location.pathname });
    window.location.href = "login.html?api=1";
    return false;
  }

  async function apiCurrentUser() {
    if (!apiToken()) return null;
    try { return (await apiRequest("/api/v1/auth/me")).user; }
    catch (error) { sessionStorage.removeItem("petHelpApiToken"); return null; }
  }

  async function apiRenderList(type) {
    const list = document.querySelector("[data-" + type + "-list]");
    if (!list) return;
    const filter = type === "goods" ? document.getElementById("goodsFilter") : null;
    const query = new URLSearchParams({ limit: "20", offset: "0" });
    if (filter?.value && filter.value !== "all") query.set("category", apiCategorySlugs[filter.value] || filter.value);
    const payload = await apiRequest("/api/v1/posts/" + type + "?" + query.toString());
    const user = await apiCurrentUser();
    list.replaceChildren();
    if (!payload.items.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500 bg-white rounded-xl p-4";
      empty.textContent = "服务端暂无有效内容";
      list.appendChild(empty);
      return;
    }
    payload.items.forEach(function (post) { list.appendChild(apiCreateCard(post, user?.id)); });
    apiTrack("post_list_view", { post_type: type, result_count: payload.items.length, page_index: 0 });
  }

  function apiAppendField(container, label, value) {
    const row = document.createElement("p");
    row.textContent = label + "：" + (value || "未填写");
    container.appendChild(row);
  }

  async function apiRenderDetail() {
    const root = document.querySelector("[data-find-detail],[data-help-detail],[data-goods-detail]");
    if (!root) return;
    const type = root.hasAttribute("data-find-detail") ? "find" : root.hasAttribute("data-help-detail") ? "help" : "goods";
    const postId = new URLSearchParams(window.location.search).get("id");
    if (!postId) { apiToast("缺少帖子编号"); return; }
    const payload = await apiRequest("/api/v1/posts/" + type + "/" + encodeURIComponent(postId));
    const post = payload.post;
    const user = await apiCurrentUser();
    const legacyContact = root.querySelector("[data-contact-button],[data-help-contact],[data-demo-contact]");
    if (legacyContact) { legacyContact.hidden = true; legacyContact.removeAttribute("data-toast"); }
    root.querySelectorAll("button[data-toast]").forEach(function (button) { button.hidden = true; });
    const title = apiPostTitle(post);
    if (type === "find") {
      root.querySelector("[data-pet-image]").textContent = "🐾";
      root.querySelector("[data-pet-title]").textContent = "急寻！" + title + "走失";
      root.querySelector("[data-pet-date]").textContent = post.lost_at || "待补充";
    } else if (type === "help") {
      root.querySelector("[data-help-title]").textContent = title;
    } else {
      root.querySelector("[data-goods-image]").textContent = "📦";
      root.querySelector("[data-goods-title]").textContent = post.title;
      root.querySelector("[data-goods-price]").textContent = post.is_free ? "免费" : "¥" + post.price;
      root.querySelector("[data-goods-category]").textContent = post.category;
      root.querySelector("[data-goods-condition]").textContent = post.condition_level;
      root.querySelector("[data-goods-place]").textContent = post.location_area;
      root.querySelector("[data-goods-desc]").textContent = post.description;
    }
    const fields = root.querySelector("[data-pet-fields],[data-help-fields]");
    if (fields) {
      fields.replaceChildren();
      const values = type === "find" ? [["品种", post.breed], ["特征", post.color_or_features], ["走失地点", post.lost_location], ["走失时间", post.lost_at], ["说明", post.description]]
        : [["互助方式", post.help_type], ["宠物情况", post.pet_description || post.pet_type], ["开始时间", post.start_at], ["结束时间", post.end_at], ["地点", post.location_area], ["需求说明", post.description]];
      values.forEach(function (item) { apiAppendField(fields, item[0], item[1]); });
    }
    const status = root.querySelector("[data-post-status]");
    if (status) status.textContent = apiStatusLabel(post.status);
    const oldActions = root.querySelector("[data-api-actions]");
    if (oldActions) oldActions.remove();
    const actions = document.createElement("div");
    actions.dataset.apiActions = "";
    actions.className = "px-5 mt-3 flex flex-wrap gap-2";
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "px-3 py-2 rounded-xl border border-orange-100 text-sm";
    favorite.textContent = apiFavorites.has(apiFavoriteKey(type, postId)) ? "已收藏" : "收藏";
    favorite.dataset.apiAction = "favorite";
    favorite.dataset.postType = type;
    favorite.dataset.postId = postId;
    actions.appendChild(favorite);
    if (post.status === "active" && post.owner?.id !== user?.id) {
      const contact = document.createElement("button");
      contact.type = "button";
      contact.className = "px-3 py-2 rounded-xl bg-mint text-white text-sm";
      contact.textContent = "获取联系方式";
      contact.dataset.apiAction = "contact";
      contact.dataset.postType = type;
      contact.dataset.postId = postId;
      actions.appendChild(contact);
      const report = document.createElement("button");
      report.type = "button";
      report.className = "px-3 py-2 rounded-xl border border-rose-100 text-coral text-sm";
      report.textContent = "举报";
      report.dataset.apiAction = "report";
      report.dataset.postType = type;
      report.dataset.postId = postId;
      actions.appendChild(report);
    }
    if (post.owner?.id && post.owner.id === user?.id) {
      const statuses = type === "find" ? [["已寻回", "resolved"], ["删除", "deleted"]] : [["下架/完成", "closed"], ["删除", "deleted"]];
      statuses.forEach(function (item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "px-3 py-2 rounded-xl border border-slate-200 text-sm";
        button.textContent = item[0];
        button.dataset.apiAction = "status";
        button.dataset.status = item[1];
        button.dataset.postType = type;
        button.dataset.postId = postId;
        actions.appendChild(button);
      });
    }
    root.appendChild(actions);
    apiTrack("post_detail_view", { post_type: type, post_id: postId, post_status: post.status });
  }

  async function apiRenderFavorites() {
    const list = document.querySelector("[data-favorites-list]");
    if (!list) return;
    const payload = await apiRequest("/api/v1/me/favorites");
    apiFavorites.clear();
    payload.items.forEach(function (post) { apiFavorites.add(apiFavoriteKey(post.post_type, post.id)); });
    const filter = document.querySelector("[data-favorite-filter].active")?.dataset.favoriteFilter || "all";
    const items = payload.items.filter(function (post) { return filter === "all" || post.post_type === filter; });
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500 bg-white rounded-xl p-4";
      empty.textContent = "服务端暂无收藏";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (post) {
      const card = apiCreateCard(post, apiUser?.id);
      list.appendChild(card);
    });
  }

  async function apiToggleFavorite(type, postId) {
    if (!await apiRequireLogin()) return;
    const key = apiFavoriteKey(type, postId);
    const removing = apiFavorites.has(key);
    try {
      await apiRequest("/api/v1/favorites/" + type + "/" + encodeURIComponent(postId), { method: removing ? "DELETE" : "PUT" });
      if (removing) apiFavorites.delete(key); else apiFavorites.add(key);
      apiTrack("favorite_change", { post_type: type, action: removing ? "remove" : "add" });
      apiToast(removing ? "已取消服务端收藏" : "已加入服务端收藏");
      if (document.querySelector("[data-favorites-list]")) await apiRenderFavorites();
      if (document.querySelector("[data-find-detail],[data-help-detail],[data-goods-detail]")) await apiRenderDetail();
    } catch (error) { apiToast(error.message); }
  }

  async function apiRenderMine() {
    const list = document.querySelector("[data-mine-post-list]");
    if (!list) return;
    const payload = await apiRequest("/api/v1/me/posts");
    list.replaceChildren();
    if (!payload.items.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500";
      empty.textContent = "服务端暂无发布内容";
      list.appendChild(empty);
    } else {
      payload.items.forEach(function (post) {
        const row = document.createElement("div");
        row.className = "border-t border-orange-100 pt-3 first:border-0 first:pt-0";
        const link = document.createElement("a");
        link.className = "text-sm font-medium text-sage";
        link.href = apiDetailHref(post.post_type, post.id);
        link.textContent = apiPostTitle(post) + " · " + apiStatusLabel(post.status);
        row.appendChild(link);
        if (["deleted", "resolved", "closed"].includes(post.status)) {
          const restore = document.createElement("button");
          restore.type = "button";
          restore.className = "ml-3 text-xs text-coral";
          restore.textContent = "撤销状态";
          restore.dataset.apiAction = "status";
          restore.dataset.status = "active";
          restore.dataset.postType = post.post_type;
          restore.dataset.postId = post.id;
          row.appendChild(restore);
        }
        list.appendChild(row);
      });
    }
    const count = document.querySelector("[data-mine-post-count]");
    if (count) count.textContent = String(payload.items.length);
  }

  async function apiHandleContact(type, postId) {
    if (!await apiRequireLogin()) return;
    apiShowDialog("获取联系方式", "确认后会向服务端申请一次性联系凭证，并调起系统拨号；请勿记录或分享号码。", null, async function () {
      try {
        const ticket = await apiRequest("/api/v1/posts/" + type + "/" + encodeURIComponent(postId) + "/contact", { method: "POST", body: { confirmed: true } });
        const result = await apiRequest("/api/v1/contact-tickets/redeem", { method: "POST", body: { contact_token: ticket.contact_token } });
        apiTrack("contact_flow", { post_type: type, stage: "redeemed", result: "success" });
        apiShowDialog("拨打电话", "请确认后打开系统拨号应用。号码不会显示在页面上。", null, function () {
          window.location.href = "tel:" + result.contact_phone;
        }, "拨号");
      } catch (error) {
        apiToast(error.message);
      }
    }, "继续拨号");
  }

  async function apiHandleReport(type, postId) {
    if (!await apiRequireLogin()) return;
    const reasons = [
      { label: "虚假信息", value: "false_information" },
      { label: "骚扰/诈骗", value: "harassment_or_scam" },
      { label: "违规内容", value: "prohibited_content" },
      { label: "隐私泄露", value: "privacy_exposure" },
      { label: "其他", value: "other" }
    ];
    apiShowDialog("举报内容", "请选择举报原因。", reasons, async function (reason) {
      try {
        await apiRequest("/api/v1/posts/" + type + "/" + encodeURIComponent(postId) + "/reports", { method: "POST", body: { reason: reason } });
        apiTrack("report_submit", { post_type: type, reason_category: reason });
        apiToast("举报已提交给服务端维护者");
      } catch (error) { apiToast(error.message); }
    }, "提交举报");
  }

  async function apiHandleStatus(type, postId, status) {
    if (!await apiRequireLogin()) return;
    const prompt = status === "deleted" ? "帖子将从公开列表移除，24 小时内可撤销。" : status === "resolved" ? "确认宠物已寻回？" : status === "active" ? "在允许的撤销期限内恢复帖子？" : "确认下架或标记完成？";
    apiShowDialog("确认操作", prompt, null, async function () {
      try {
        await apiRequest("/api/v1/posts/" + type + "/" + encodeURIComponent(postId), { method: "PATCH", body: { status: status } });
        apiTrack("post_status_change", { post_type: type, to_status: status, change_source: "owner" });
        apiToast("帖子状态已保存到服务端");
        if (type === "find" && document.querySelector("[data-find-list]")) await apiRenderList(type);
        else if (type === "help" && document.querySelector("[data-help-list]")) await apiRenderList(type);
        else if (type === "goods" && document.querySelector("[data-goods-list]")) await apiRenderList(type);
        else if (document.querySelector("[data-mine-post-list]")) await apiRenderMine();
        else await apiRenderDetail();
      } catch (error) { apiToast(error.message); }
    }, "确认");
  }

  function apiFormPayload(form, type) {
    const values = {};
    new FormData(form).forEach(function (value, key) { values[key] = String(value).trim(); });
    if (!form.querySelector("[name=contactConsent]")?.checked) throw new Error("请确认联系方式用途");
    if (type === "find") {
      return {
        pet_name: values.name,
        breed: values.breed,
        color_or_features: values.appearance,
        age: values.age || null,
        lost_at: new Date(values.lostTime + "T12:00:00").toISOString(),
        lost_location: values.place,
        description: values.description,
        reward: values.reward || null,
        contact_note: values.contactNote || null,
        contact_phone: values.contact,
        image_refs: []
      };
    }
    if (type === "help") {
      return {
        help_type: values.helpType,
        pet_type: values.petType,
        pet_description: values.petAge || null,
        start_at: new Date(values.startAt).toISOString(),
        end_at: new Date(values.endAt).toISOString(),
        location_area: values.place,
        description: values.desc,
        contact_phone: values.contact,
        image_refs: []
      };
    }
    const isFree = Boolean(form.querySelector("[name=isFree]")?.checked);
    return {
      title: values.name,
      category: values.category,
      price: isFree ? null : Number(values.price),
      is_free: isFree,
      condition_level: values.condition,
      description: values.desc,
      location_area: values.place,
      contact_phone: values.contact,
      image_refs: []
    };
  }

  async function apiHandlePublish(form) {
    const type = form.hasAttribute("data-save-find") ? "find" : form.hasAttribute("data-save-help") ? "help" : "goods";
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!await apiRequireLogin(form)) return;
    let body;
    try { body = apiFormPayload(form, type); }
    catch (error) { apiToast(error.message); return; }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const result = await apiRequest("/api/v1/posts/" + type, { method: "POST", body: body });
      apiTrack("publish_result", { post_type: type, result: "success" });
      apiToast("帖子已保存到 SQLite 服务端");
      form.reset();
      const redirect = form.getAttribute("data-redirect");
      if (redirect) setTimeout(function () { window.location.href = redirect; }, 350);
    } catch (error) {
      apiToast(error.message);
      apiTrack("publish_result", { post_type: type, result: "failed" });
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  let apiUser = null;

  async function initApiMode() {
    const shell = document.querySelector(".app-shell");
    if (window.location.pathname.endsWith("login.html")) {
      const loginButton = document.querySelector("[data-href]");
      if (loginButton) loginButton.textContent = "使用本机开发账号";
      const loginNote = document.querySelector("main p.text-xs");
      if (loginNote) loginNote.textContent = "此页面仅使用本机 API 开发账号；真实微信 code 需在微信小程序容器中获取。";
    }
    if (shell) {
      const banner = document.createElement("p");
      banner.className = "mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 text-xs text-slate-600";
      banner.textContent = "API 联调模式：数据保存到本机 SQLite；请只使用合成联系方式。当前未启用 HTTPS。";
      shell.insertBefore(banner, shell.firstChild);
    }

    document.addEventListener("click", async function (event) {
      const target = event.target.closest("button,a");
      if (!target) return;
      if (target.hasAttribute("data-href") && window.location.pathname.endsWith("login.html")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          const user = await apiRequest("/api/v1/auth/demo", { method: "POST", body: { display_name: "本机联调用户" } });
          sessionStorage.setItem("petHelpApiToken", user.access_token);
          apiTrack("login_result", { result: "development_demo" });
          const returnTo = sessionStorage.getItem("petHelpApiReturnTo") || "mine.html";
          sessionStorage.removeItem("petHelpApiReturnTo");
          window.location.href = returnTo;
        } catch (error) { apiToast(error.message); }
        return;
      }
      if (target.hasAttribute("data-api-action")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const type = target.dataset.postType;
        const postId = target.dataset.postId;
        if (target.dataset.apiAction === "favorite") {
          await apiToggleFavorite(type, postId);
        } else if (target.dataset.apiAction === "contact") {
          await apiHandleContact(type, postId);
        } else if (target.dataset.apiAction === "report") {
          await apiHandleReport(type, postId);
        } else if (target.dataset.apiAction === "status") {
          await apiHandleStatus(type, postId, target.dataset.status);
        }
        return;
      }
      if (target.hasAttribute("data-favorite-filter")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.querySelectorAll("[data-favorite-filter]").forEach(function (button) {
          const active = button === target;
          button.classList.toggle("active", active);
          button.classList.toggle("bg-peach", active);
          button.classList.toggle("text-white", active);
        });
        try { await apiRenderFavorites(); } catch (error) { apiToast(error.message); }
        return;
      }
      if (target.hasAttribute("data-demo-logout")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try { await apiRequest("/api/v1/auth/logout", { method: "POST" }); } catch (error) {}
        sessionStorage.removeItem("petHelpApiToken");
        window.location.reload();
      }
    }, true);

    document.addEventListener("submit", function (event) {
      const form = event.target;
      if (!form.matches("form[data-save-find],form[data-save-help],form[data-save-goods]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void apiHandlePublish(form);
    }, true);

    document.querySelectorAll("form[data-save-find],form[data-save-help],form[data-save-goods]").forEach(function (form) {
      const phone = form.querySelector("[name=contact]");
      if (phone) phone.placeholder = "API 联调仅用合成号码；服务端会保存此字段";
    });
    let pendingDraft = null;
    try { pendingDraft = JSON.parse(sessionStorage.getItem("petHelpApiPendingDraft") || "null"); } catch (error) { pendingDraft = null; }
    if (pendingDraft) {
      const selector = pendingDraft.type === "find" ? "form[data-save-find]" : pendingDraft.type === "help" ? "form[data-save-help]" : "form[data-save-goods]";
      const form = document.querySelector(selector);
      if (form) {
        Object.keys(pendingDraft.values || {}).forEach(function (name) {
          const field = form.elements.namedItem(name);
          if (field) field.value = pendingDraft.values[name];
        });
        sessionStorage.removeItem("petHelpApiPendingDraft");
        apiToast("已恢复草稿；请重新填写合成联系方式并确认用途");
      }
    }

    try {
      const health = await apiRequest("/api/v1/health");
      if (health.wechat_auth_configured) document.body.dataset.wechatConfigured = "true";
      const token = apiToken();
      if (token) {
        try { apiUser = (await apiRequest("/api/v1/auth/me")).user; }
        catch (error) { sessionStorage.removeItem("petHelpApiToken"); }
      }
      if (apiUser) await apiLoadFavorites();
      if (document.querySelector("[data-find-list]")) await apiRenderList("find");
      if (document.querySelector("[data-help-list]")) await apiRenderList("help");
      if (document.querySelector("[data-goods-list]")) await apiRenderList("goods");
      if (document.querySelector("[data-find-detail],[data-help-detail],[data-goods-detail]")) await apiRenderDetail();
      if (document.querySelector("[data-favorites-list]")) {
        if (await apiRequireLogin()) await apiRenderFavorites();
      }
      if (document.querySelector("[data-mine-post-list]")) {
        const count = document.querySelector("[data-mine-post-count]");
        const favoriteCount = document.querySelector("[data-mine-favorite-count]");
        const display = document.querySelector("[data-demo-user-name]");
        const authState = document.querySelector("[data-demo-user-auth]");
        if (display) display.textContent = apiUser ? apiUser.display_name : "访客模式";
        if (authState) authState.textContent = apiUser ? "服务端会话 · 未实名认证" : "未登录 · API 模式";
        if (await apiRequireLogin()) {
          const mine = await apiRequest("/api/v1/me/posts");
          const favorites = await apiRequest("/api/v1/me/favorites");
          if (count) count.textContent = String(mine.items.length);
          if (favoriteCount) favoriteCount.textContent = String(favorites.items.length);
          await apiRenderMine();
        }
      }
      const feed = document.querySelector("[data-home-feed]");
      if (feed) {
        const groups = await Promise.all(["find", "help", "goods"].map(function (type) { return apiRequest("/api/v1/posts/" + type + "?limit=4"); }));
        const items = groups.flatMap(function (group) { return group.items; }).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); }).slice(0, 4);
        feed.replaceChildren();
        if (!items.length) {
          const empty = document.createElement("p");
          empty.className = "text-sm text-slate-500 bg-white rounded-xl p-4";
          empty.textContent = "服务端暂无有效社区动态";
          feed.appendChild(empty);
        } else items.forEach(function (post) { feed.appendChild(apiCreateCard(post, apiUser?.id)); });
      }
      const filter = document.getElementById("goodsFilter");
      if (filter) filter.addEventListener("change", function () { void apiRenderList("goods").catch(function (error) { apiToast(error.message); }); });
    } catch (error) {
      const warning = document.createElement("div");
      warning.className = "mx-4 mt-3 p-3 rounded-xl bg-rose-50 text-sm text-coral";
      warning.textContent = error.message;
      document.querySelector(".app-shell")?.prepend(warning);
    }
  }

  function bindFreePriceControl() {
    document.querySelectorAll("[data-free-toggle]").forEach(function (toggle) {
      const price = toggle.form?.elements.namedItem("price");
      if (!price) return;
      const sync = function () {
        price.disabled = toggle.checked;
        price.required = !toggle.checked;
      };
      toggle.addEventListener("change", sync);
      sync();
    });
  }

  function typeFromPathForDemo() {
    if (document.querySelector("[data-find-detail]")) return "find";
    if (document.querySelector("[data-help-detail]")) return "help";
    if (document.querySelector("[data-goods-detail]")) return "goods";
    return null;
  }

  bindFreePriceControl();
  if (API_MODE) void initApiMode();
  else bindDemoInteractions();
})();
