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
