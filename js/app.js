(function () {
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
      contact: "138****2190",
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
      contact: "139****6672",
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
      contact: "186****4418",
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
      if (field.name) {
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
      if (field.name) record[field.name] = field.value.trim();
    });
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
      article.innerHTML = '<div class="flex gap-3"><div class="w-16 h-16 rounded-2xl placeholder text-2xl shrink-0">🐾</div>' +
        '<div class="min-w-0 flex-1"><div class="flex items-center justify-between"><h2 class="font-semibold">我发布的互助</h2>' +
        '<span class="text-[11px] bg-teal-50 text-sage px-2 py-0.5 rounded-full">待报名</span></div>' +
        '<p class="text-sm text-slate-500 mt-1">宠物类型：' + item.petType + (item.petAge ? " · " + item.petAge : "") + '</p>' +
        '<p class="text-sm text-slate-500">寄养时间：' + item.time + '</p></div></div>' +
        '<p class="text-sm text-slate-600 mt-3">' + item.desc + '</p>' +
        '<button data-toast="已报名，已通知发布者" class="mt-3 w-full py-2.5 rounded-xl bg-mint text-white text-sm font-medium">我来报名</button>' +
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
      const categoryMap = { "宠物主粮": "food", "笼子猫砂": "cage", "玩具用品": "toy", "穿戴用品": "wear", "其他": "other" };
      const card = document.createElement("a");
      card.href = "goods-detail.html?id=" + encodeURIComponent(id) + "&from=goods";
      card.dataset.category = categoryMap[item.category] || "other";
      card.className = "bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-50";
      card.innerHTML = '<div class="h-28 placeholder text-3xl">📦</div><div class="p-3"><h2 class="text-sm font-semibold truncate">' + item.name +
        '</h2><p class="text-coral font-semibold mt-1">¥' + item.price + '</p><p class="text-[11px] text-slate-400 mt-1">' + item.category +
        " · " + item.condition + '</p></div>';
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
      "help-lin": { title: "林阿姨", petType: "布偶猫", petAge: "2岁", time: "9.20 - 9.22", place: "阳光花园", desc: "周末出差，希望邻居帮忙喂食铲砂，可提供猫粮与酬谢。", contact: "138****2190" },
      "help-zhou": { title: "小周", petType: "金毛", petAge: "温顺", time: "9.18 晚 - 9.19 午", place: "小区内", desc: "加班到很晚，需要有人帮忙遛一次狗。", contact: "139****6672" },
      "help-chen": { title: "陈同学", petType: "仓鼠", petAge: "", time: "国庆 7 天", place: "待确认", desc: "回家过节，笼子可一起带走，饲料已备好。", contact: "186****4418" }
    };
    const item = saved[id] || defaults[id] || defaults["help-lin"];
    detail.querySelector("[data-help-title]").textContent = item.title + "的互助需求";
    detail.querySelector("[data-help-fields]").innerHTML = "<p>宠物类型：" + item.petType + "</p><p>宠物年龄：" + (item.petAge || "未填写") + "</p><p>寄养时间：" + item.time + "</p><p>互助地点：" + item.place + "</p><p>需求说明：" + item.desc + "</p><p>联系方式：" + item.contact + "</p>";
    detail.querySelector("[data-help-contact]").setAttribute("data-toast", "已模拟联系发布者：" + item.contact);
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
      food: { name: "未开封成猫粮 2kg", price: "45", category: "宠物主粮", condition: "全新未拆", place: "阳光花园自提", desc: "未开封成猫粮，保存完好。", emoji: "🥫" },
      carrier: { name: "折叠航空箱", price: "80", category: "笼子猫砂", condition: "九成新", place: "翠湖公园附近", desc: "折叠便携，适合短途出行。", emoji: "📦" },
      leash: { name: "牵引绳套装", price: "22", category: "穿戴用品", condition: "八成新", place: "梧桐里自提", desc: "牵引绳和胸背套装。", emoji: "🎀" },
      shampoo: { name: "宠物沐浴露余量", price: "12", category: "其他", condition: "使用痕迹明显", place: "阳光花园", desc: "宠物沐浴露，剩余约一半。", emoji: "🧴" },
      litter: { name: "豆腐猫砂 6L", price: "18", category: "笼子猫砂", condition: "全新未拆", place: "梧桐里自提", desc: "豆腐猫砂 6L，未拆封。", emoji: "🧻" }
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
      card.innerHTML = '<div class="h-40 placeholder text-4xl">' + (pet.emoji || "🐾") + '</div>' +
        '<div class="p-4"><div class="flex items-start justify-between gap-3"><div>' +
        '<h2 class="font-semibold text-lg">' + pet.name + '</h2>' +
        '<p class="text-sm text-slate-500 mt-1">品种：' + pet.breed + '</p>' +
        '<p class="text-sm text-slate-500">走失地点：' + pet.place + '</p></div>' +
        '<span class="text-[11px] bg-rose-50 text-coral px-2 py-1 rounded-full shrink-0">寻找中</span></div>' +
        '<button data-toast="已模拟拨打：' + pet.contact + '" class="mt-4 w-full py-2.5 rounded-xl bg-mint text-white text-sm font-medium">联系主人</button></div>';
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
      "<p>宠物名称：" + pet.name + "</p><p>宠物品种：" + pet.breed + "</p><p>性别、年龄：" + (pet.age || "未填写") +
      "</p><p>走失地点：" + pet.place + "</p><p>外貌特征：" + pet.appearance + "</p><p>悬赏说明：" + (pet.reward || "无") +
      "</p><p>联系说明：" + (pet.contactNote || "无") + "</p>";
    detail.querySelector("[data-contact-button]").setAttribute("data-toast", "已模拟联系主人：" + pet.contact);
  }

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
})();
