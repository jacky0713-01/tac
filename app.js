import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh4wNEwXzGOxKOJqj3Akg7gj1WxFHzmNQ",
  authDomain: "throw-a-coin.firebaseapp.com",
  projectId: "throw-a-coin",
  storageBucket: "throw-a-coin.firebasestorage.app",
  messagingSenderId: "79225369395",
  appId: "1:79225369395:web:ac6b6dadb1154159c40446",
  measurementId: "G-B84NLZX6Z8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let customColumns = [];

const defaultDatabase = {
  163: { name: "Nautilus", rarity: "Chronal" },
  164: { name: "Training Dummy", rarity: "Carved" },
  165: { name: "Golden Fan", rarity: "Carved" },
  166: { name: "Bonsai Tree", rarity: "Carved" },
  167: { name: "Lucky Medallion", rarity: "Carved" },
  168: { name: "War Drum", rarity: "Honed" },
  169: { name: "Shuriken", rarity: "Honed" },
  170: { name: "Stone Lantern", rarity: "Honed" },
  171: { name: "Katana", rarity: "Tempered" },
  172: { name: "Emperor Crown", rarity: "Tempered" },
  173: { name: "Sacred Vase", rarity: "Tempered" },
  174: { name: "Oni Mask", rarity: "Yokai" },
  175: { name: "Oni Hammer", rarity: "Yokai" },
  176: { name: "Torii Gate", rarity: "Veiled" },
  177: { name: "Imperial Throne", rarity: "Veiled" },
  178: { name: "Dojo", rarity: "Hallowed" },
  179: { name: "Great Pagoda", rarity: "Hallowed" },
  180: { name: "Dragon Temple", rarity: "Imperial" },
  181: { name: "Imperial Seal", rarity: "Imperial" }
};

// 修正：初始設為空物件，完全由 Firebase 雲端資料決定現有列表
let itemsData = {};

// 初始化預設資料的函式（僅在雲端完全沒有 items 資料時才預載）
function generateDefaultItems() {
  const TOTAL_ITEMS = 188;
  const initialData = {};
  for (let i = 1; i <= TOTAL_ITEMS; i++) {
    const preset = defaultDatabase[i] || {};
    initialData[`item_${i}`] = {
      id: i,
      name: preset.name || `物品 #${i}`,
      rarity: preset.rarity || `Common`,
      imageUrl: "",
      astral: false,
      astralCount: 0,
      divine: false,
      void: false,
      extraFields: {}
    };
  }
  return initialData;
}

const tbody = document.getElementById("table-body");
const cardContainer = document.getElementById("card-view-container");
const tableViewContainer = document.getElementById("table-view-container");
const authBtn = document.getElementById("auth-btn");
const authStatus = document.getElementById("auth-status");
const searchInput = document.getElementById("search-input");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file-input");
const btnViewTable = document.getElementById("btn-view-table");
const btnViewCard = document.getElementById("btn-view-card");

const tradeBtn = document.getElementById("trade-btn");
const tradeOverlay = document.getElementById("trade-modal-overlay");
const closeModalBtn = document.getElementById("modal-close-btn");
const tradeTextOutput = document.getElementById("trade-text-output");
const copyTradeBtn = document.getElementById("copy-trade-btn");

function renderHeader() {
  const headerRow = document.getElementById("table-header-row");
  headerRow.innerHTML = `
    <th style="width: 70px;">編號</th>
    <th style="width: 140px;">物品名稱</th>
    <th style="width: 100px; text-align: left; padding-left: 10px;">圖片</th>
    <th style="width: 130px;">稀有度</th>
    <th style="width: 120px; text-align: center;">ASTRAL</th>
    <th style="width: 130px; text-align: center;">ASTRAL COUNT</th>
    <th style="width: 120px; text-align: center;">DIVINE</th>
    <th style="width: 120px; text-align: center;">VOID</th>
  `;
  
  customColumns.forEach(col => {
    const th = document.createElement("th");
    th.style.textAlign = "center";
    th.style.width = "120px";
    th.innerText = col.name.toUpperCase();
    headerRow.appendChild(th);
  });
}

function render() {
  renderHeader();
  const query = searchInput.value.toLowerCase().trim();
  tbody.innerHTML = "";
  cardContainer.innerHTML = "";

  let astralCountSum = 0;
  let astralCollected = 0;
  let divineCollected = 0;
  let voidCollected = 0;

  const sortedKeys = Object.keys(itemsData).sort((a, b) => itemsData[a].id - itemsData[b].id);

  sortedKeys.forEach(key => {
    const item = itemsData[key];

    if (item.astral) astralCollected++;
    if (item.divine) divineCollected++;
    if (item.void) voidCollected++;
    astralCountSum += (item.astralCount || 0);

    const matchSearch = item.name.toLowerCase().includes(query) || String(item.id).includes(query);
    if (!matchSearch) return;

    const safeRarityName = item.rarity ? item.rarity.toLowerCase().replace(/[^a-z0-9]/g, '') : 'common';
    const rarityClass = `rarity-${safeRarityName}`;
    const isUnlocked = item.astral || item.divine || item.void || (item.astralCount > 0);

    const tr = document.createElement("tr");
    let extraTdHTML = "";
    
    customColumns.forEach(col => {
      if (!item.extraFields) item.extraFields = {};
      if (col.type === "boolean") {
        const val = item.extraFields[col.key] || false;
        extraTdHTML += `
          <td class="status-cell" onclick="toggleExtraField('${key}', '${col.key}', 'boolean')">
            <span class="badge ${val ? 'badge-collected' : 'badge-empty'}">${val ? '✓ 已收集' : '-'}</span>
          </td>
        `;
      } else {
        const val = item.extraFields[col.key] || 0;
        extraTdHTML += `
          <td class="status-cell">
            <div class="count-box">
              <button class="count-btn" onclick="adjustExtraCount(event, '${key}', '${col.key}', -1)">-</button>
              <span onclick="editExtraCountDirect('${key}', '${col.key}')" style="min-width: 24px; text-align: center;">${val}</span>
              <button class="count-btn" onclick="adjustExtraCount(event, '${key}', '${col.key}', 1)">+</button>
            </div>
          </td>
        `;
      }
    });

    tr.innerHTML = `
      <td><strong>#${item.id}</strong></td>
      <td class="editable-cell" ondblclick="editField('${key}', 'name')" title="登入後雙擊修改名稱"><strong>${item.name}</strong></td>
      <td class="editable-cell" style="text-align: left; padding-left: 10px;" ondblclick="editField('${key}', 'imageUrl')" title="登入後雙擊設定圖片網址">
        <div class="item-img-container">
          ${item.imageUrl ? `<img src="${item.imageUrl}" class="item-img" alt="${item.name}">` : `<span class="img-placeholder">+圖片</span>`}
        </div>
      </td>
      <td class="editable-cell" ondblclick="editField('${key}', 'rarity')" title="登入後雙擊修改稀有度">
        <span class="rarity-tag ${rarityClass}">${item.rarity}</span>
      </td>
      <td class="status-cell" onclick="toggleStatus('${key}', 'astral')">
        <span class="badge ${item.astral ? 'badge-collected' : 'badge-empty'}">${item.astral ? '✓ 已收集' : '-'}</span>
      </td>
      <td class="status-cell">
        <div class="count-box">
          <button class="count-btn" onclick="adjustCount(event, '${key}', -1)">-</button>
          <span onclick="editCountDirect('${key}')" style="min-width: 24px; text-align: center;">${item.astralCount || 0}</span>
          <button class="count-btn" onclick="adjustCount(event, '${key}', 1)">+</button>
        </div>
      </td>
      <td class="status-cell" onclick="toggleStatus('${key}', 'divine')">
        <span class="badge ${item.divine ? 'badge-collected' : 'badge-empty'}">${item.divine ? '✓ 已收集' : '-'}</span>
      </td>
      <td class="status-cell" onclick="toggleStatus('${key}', 'void')">
        <span class="badge ${item.void ? 'badge-collected' : 'badge-empty'}">${item.void ? '✓ 已收集' : '-'}</span>
      </td>
      ${extraTdHTML}
    `;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = `item-card ${isUnlocked ? 'unlocked fx-' + safeRarityName : 'locked'}`;
    card.innerHTML = `
      ${!isUnlocked ? `<div class="lock-icon">🔒</div>` : ''}
      <div class="card-id">#${item.id}</div>
      <div class="card-img-wrapper">
        ${item.imageUrl ? `<img src="${item.imageUrl}" class="card-img" alt="${item.name}">` : `<span class="img-placeholder" style="font-size:2rem;">❓</span>`}
      </div>
      <div class="card-title">${item.name}</div>
      <div><span class="rarity-tag ${rarityClass}">${item.rarity}</span></div>
      <div class="card-badges">
        <span class="card-badge-item ${item.astral ? 'active-astral' : ''}">Astral: ${item.astral ? '✓' : '-'} (${item.astralCount || 0})</span>
        <span class="card-badge-item ${item.divine ? 'active-divine' : ''}">Divine: ${item.divine ? '✓' : '-'}</span>
        <span class="card-badge-item ${item.void ? 'active-void' : ''}">Void: ${item.void ? '✓' : '-'}</span>
      </div>
    `;
    cardContainer.appendChild(card);
  });

  const totalCount = sortedKeys.length;
  document.getElementById("stat-astral").innerText = `${astralCollected} / ${totalCount} (${Math.round((astralCollected / totalCount) * 100 || 0)}%)`;
  document.getElementById("stat-divine").innerText = `${divineCollected} / ${totalCount} (${Math.round((divineCollected / totalCount) * 100 || 0)}%)`;
  document.getElementById("stat-void").innerText = `${voidCollected} / ${totalCount} (${Math.round((voidCollected / totalCount) * 100 || 0)}%)`;
  document.getElementById("stat-count-total").innerText = astralCountSum;
}

window.toggleStatus = async (key, field) => {
  if (!auth.currentUser) return;
  itemsData[key][field] = !itemsData[key][field];
  render();
  await syncToCloud();
};

window.adjustCount = async (e, key, delta) => {
  e.stopPropagation();
  if (!auth.currentUser) return;
  const current = itemsData[key].astralCount || 0;
  itemsData[key].astralCount = Math.max(0, current + delta);
  render();
  await syncToCloud();
};

window.editCountDirect = async (key) => {
  if (!auth.currentUser) return;
  const input = prompt("請輸入 Astral Count 數量：", itemsData[key].astralCount || 0);
  if (input !== null) {
    const val = parseInt(input, 10);
    if (!isNaN(val) && val >= 0) {
      itemsData[key].astralCount = val;
      render();
      await syncToCloud();
    }
  }
};

window.editField = async (key, field) => {
  if (!auth.currentUser) return;
  const oldVal = itemsData[key][field] || "";
  const newVal = prompt(`修改 ${field}:`, oldVal);
  if (newVal !== null) {
    itemsData[key][field] = newVal.trim();
    render();
    await syncToCloud();
  }
};

window.toggleExtraField = async (key, colKey, type) => {
  if (!auth.currentUser) return;
  if (!itemsData[key].extraFields) itemsData[key].extraFields = {};
  itemsData[key].extraFields[colKey] = !itemsData[key].extraFields[colKey];
  render();
  await syncToCloud();
};

window.adjustExtraCount = async (e, key, colKey, delta) => {
  e.stopPropagation();
  if (!auth.currentUser) return;
  if (!itemsData[key].extraFields) itemsData[key].extraFields = {};
  const current = itemsData[key].extraFields[colKey] || 0;
  itemsData[key].extraFields[colKey] = Math.max(0, current + delta);
  render();
  await syncToCloud();
};

window.editExtraCountDirect = async (key, colKey) => {
  if (!auth.currentUser) return;
  if (!itemsData[key].extraFields) itemsData[key].extraFields = {};
  const input = prompt("請輸入數量：", itemsData[key].extraFields[colKey] || 0);
  if (input !== null) {
    const val = parseInt(input, 10);
    if (!isNaN(val) && val >= 0) {
      itemsData[key].extraFields[colKey] = val;
      render();
      await syncToCloud();
    }
  }
};

async function syncToCloud() {
  try {
    await setDoc(doc(db, "tracker", "progress"), { 
      items: itemsData,
      customColumns: customColumns 
    });
    console.log("雲端同步成功！");
  } catch (e) {
    console.error("同步至 Firebase 失敗：", e);
  }
}

// 雲端監聽：首次若沒有資料會用預設 188 筆初始化
onSnapshot(doc(db, "tracker", "progress"), async (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.items) itemsData = data.items;
    if (data.customColumns) customColumns = data.customColumns;
    render();
  } else {
    itemsData = generateDefaultItems();
    render();
    await syncToCloud();
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    document.body.classList.remove("read-only");
    authStatus.innerText = "當前狀態：管理員模式";
    authBtn.innerText = "登出";
  } else {
    document.body.classList.add("read-only");
    authStatus.innerText = "當前狀態：瀏覽模式 (唯讀)";
    authBtn.innerText = "管理員登入";
  }
});

authBtn.onclick = async () => {
  if (auth.currentUser) {
    await signOut(auth);
  } else {
    const email = prompt("請輸入管理員 Email：");
    const password = prompt("請輸入密碼：");
    if (email && password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        alert("登入失敗：" + e.message);
      }
    }
  }
};

btnViewTable.onclick = () => {
  btnViewTable.classList.add("active");
  btnViewCard.classList.remove("active");
  tableViewContainer.style.display = "block";
  cardContainer.style.display = "none";
};

btnViewCard.onclick = () => {
  btnViewCard.classList.add("active");
  btnViewTable.classList.remove("active");
  cardContainer.style.display = "grid";
  tableViewContainer.style.display = "none";
};

searchInput.oninput = () => render();

tradeBtn.onclick = () => {
  let output = "【Throw a Coin - 收集圖鑑清單】\n";
  output += "-----------------------------\n";
  Object.keys(itemsData).forEach(k => {
    const item = itemsData[k];
    if (item.astral || item.divine || item.void || item.astralCount > 0) {
      output += `#${item.id} ${item.name} (${item.rarity}): `;
      let tags = [];
      if (item.astral) tags.push(`Astral x${item.astralCount || 1}`);
      if (item.divine) tags.push("Divine");
      if (item.void) tags.push("Void");
      output += tags.join(", ") + "\n";
    }
  });
  tradeTextOutput.value = output;
  tradeOverlay.classList.add("active");
};

closeModalBtn.onclick = () => tradeOverlay.classList.remove("active");
copyTradeBtn.onclick = () => {
  navigator.clipboard.writeText(tradeTextOutput.value);
  alert("交易格式文字已複製！");
};

document.getElementById("export-csv-btn").onclick = () => {
  let csvStr = "\uFEFFID,Name,Rarity,Astral,AstralCount,Divine,Void\n";
  Object.keys(itemsData).forEach(k => {
    const item = itemsData[k];
    csvStr += `${item.id},"${item.name}","${item.rarity}",${item.astral ? "YES" : "NO"},${item.astralCount || 0},${item.divine ? "YES" : "NO"},${item.void ? "YES" : "NO"}\n`;
  });
  const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ThrowACoin_Tracker_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

document.getElementById("export-json-btn").onclick = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ items: itemsData, customColumns: customColumns }, null, 2));
  const a = document.createElement("a");
  a.href = dataStr;
  a.download = `backup_tac_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
};

importBtn.onclick = () => importFileInput.click();
importFileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (imported.items) itemsData = imported.items;
      if (imported.customColumns) customColumns = imported.customColumns;
      render();
      await syncToCloud();
      alert("備份資料成功匯入！");
    } catch (err) {
      alert("檔案格式不正確！");
    }
  };
  reader.readAsText(file);
};

// 新增列
const addItemBtn = document.getElementById("add-item-btn");
if (addItemBtn) {
  addItemBtn.onclick = async () => {
    if (!auth.currentUser) return;
    const keys = Object.keys(itemsData).map(k => itemsData[k].id || 0);
    const nextId = keys.length > 0 ? Math.max(...keys) + 1 : 1;
    const name = prompt(`請輸入新物品 (ID #${nextId}) 的名稱：`, `物品 #${nextId}`);
    if (!name) return;

    itemsData[`item_${nextId}`] = {
      id: nextId,
      name: name.trim(),
      rarity: "Common",
      imageUrl: "",
      astral: false,
      astralCount: 0,
      divine: false,
      void: false,
      extraFields: {}
    };

    render();
    await syncToCloud();
  };
}

// 刪除最後一列 (精確徹底刪除)
const deleteItemBtn = document.getElementById("delete-item-btn");
if (deleteItemBtn) {
  deleteItemBtn.onclick = async () => {
    if (!auth.currentUser) return;
    const sortedKeys = Object.keys(itemsData).sort((a, b) => itemsData[a].id - itemsData[b].id);
    if (sortedKeys.length === 0) return alert("目前沒有物品可刪除！");

    const lastKey = sortedKeys[sortedKeys.length - 1];
    const item = itemsData[lastKey];

    if (confirm(`確定要刪除最後一列 [#${item.id} ${item.name}] 嗎？`)) {
      delete itemsData[lastKey];
      render();
      await syncToCloud();
      
      // 同時向 Firebase 發送欄位刪除指令
      try {
        await setDoc(doc(db, "tracker", "progress"), {
          items: {
            [lastKey]: deleteField()
          }
        }, { merge: true });
        console.log(`成功從雲端抹除 ${lastKey}`);
      } catch (e) {
        console.error("雲端抹除失敗：", e);
      }
    }
  };
}

// 新增欄位
const addColBtn = document.getElementById("add-col-btn");
if (addColBtn) {
  addColBtn.onclick = async () => {
    if (!auth.currentUser) return;
    const name = prompt("請輸入新欄位名稱 (例如：SHINY, MUTATED)：");
    if (!name) return;

    const isBoolean = confirm("該欄位類型是否為「勾選框 (是/否)」？\n[按確定] 勾選方塊\n[按取消] 數字計數器");
    const colKey = "col_" + Date.now();

    customColumns.push({
      key: colKey,
      name: name.trim(),
      type: isBoolean ? "boolean" : "number"
    });

    render();
    await syncToCloud();
  };
}

// 刪除欄位
const delColBtn = document.getElementById("del-col-btn");
if (delColBtn) {
  delColBtn.onclick = async () => {
    if (!auth.currentUser) return;
    if (customColumns.length === 0) return alert("目前沒有自訂欄位可刪除！");

    const namesList = customColumns.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    const indexInput = prompt(`請輸入要刪除的欄位編號：\n${namesList}`);
    const index = parseInt(indexInput, 10) - 1;

    if (!isNaN(index) && index >= 0 && index < customColumns.length) {
      const removedCol = customColumns.splice(index, 1)[0];
      Object.keys(itemsData).forEach(k => {
        if (itemsData[k].extraFields) delete itemsData[k].extraFields[removedCol.key];
      });

      render();
      await syncToCloud();
    }
  };
}
