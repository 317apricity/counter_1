import { db, doc, getDoc, setDoc } from "./firebase.js";

let companies = {};
let currentTab = 1;
const docRef = doc(db, "companies", "all_data");

async function initSystem() {
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            companies = docSnap.data();
        } else {
            for (let i = 1; i <= 8; i++) {
                companies[i] = { currentIndex: 0, members: [] };
            }
            await saveData();
        }
        setupEventListeners();
        renderActiveCompany();
    } catch (error) {
        console.error("데이터베이스 연결 실패: ", error);
    }
}

async function saveData() {
    try {
        await setDoc(docRef, companies);
    } catch (error) {
        console.error("데이터 저장 실패: ", error);
    }
}

function setupEventListeners() {
    const companySelect = document.getElementById("companySelect");
    companySelect.addEventListener("change", (e) => {
        currentTab = parseInt(e.target.value);
        renderActiveCompany();
    });

    document.getElementById("addMemberBtn").addEventListener("click", window.addMember);
    document.getElementById("bulkRegisterBtn").addEventListener("click", window.bulkRegister);
    document.getElementById("assignBtn").addEventListener("click", window.assignDuty);
    document.getElementById("shuffleBtn").addEventListener("click", window.shuffleDuty);
}

function renderActiveCompany() {
    const comp = companies[currentTab];
    if (!comp) return;

    // 🚀 다음 순번 대상자 실시간 계산 (미참 대원 제외)
    let nextName = "없음";
    if (comp.members.length > 0) {
        let idx = comp.currentIndex;
        let found = false;
        for (let i = 0; i < comp.members.length; i++) {
            let checkIdx = (idx + i) % comp.members.length;
            if (comp.members[checkIdx].status === "active") {
                nextName = comp.members[checkIdx].name;
                found = true;
                break;
            }
        }
        if (!found) nextName = "가용 인원 없음";
    }
    document.getElementById("nextTarget").innerText = nextName;

    const tableBody = document.getElementById("memberTableBody");
    tableBody.innerHTML = "";

    comp.members.forEach((m, idx) => {
        const tr = document.createElement("tr");

        // 행 배경색 스타일 조건 지정
        if (m.status === "inactive") {
            tr.className = "status-absent";
        } else if (m.checked) {
            tr.className = "status-confirmed";
        } else if (idx === comp.currentIndex && m.status === "active") {
            tr.className = "status-pending";
        }

        const warningIcons = "⚠️".repeat(m.warningCount);
        const passIcons = "🚫".repeat(m.passCount);

        // 🚀 참여여부와 메모를 가장 우측으로 이동시킨 신규 배치 테이블 구조
        tr.innerHTML = `
            <td>${m.status === 'inactive' ? '❌ 미참' : (m.checked ? '✅ 확정' : '⏳ 대기')}</td>
            <td>
                <strong>${m.name}</strong> 
                ${(idx === comp.currentIndex && m.status === "active") ? '<span style="color:red; font-size:10px;"><br>[현재순번]</span>' : ''}
            </td>
            <td>${warningIcons || '-'}</td>
            <td>${passIcons || '-'}</td>
            <td>
                <div class="btn-group">
                    <button onclick="window.modifyItem(${idx}, 'warning', 1)">⚠️+</button>
                    <button onclick="window.modifyItem(${idx}, 'warning', -1)">⚠️-</button>
                    <button onclick="window.modifyItem(${idx}, 'pass', 1)">🚫+</button>
                    <button onclick="window.modifyItem(${idx}, 'pass', -1)">🚫-</button>
                </div>
            </td>
            <td>
                <button style="background:#ffcdd2; border:1px solid #f44336; padding:4px 8px; border-radius:4px;" 
                        onclick="window.deleteMember(${idx})">삭제</button>
            </td>
            <td>
                <select onchange="window.changeStatus(${idx}, this.value)">
                    <option value="active" ${m.status === 'active' ? 'selected' : ''}>참여</option>
                    <option value="inactive" ${m.status === 'inactive' ? 'selected' : ''}>미참여</option>
                </select>
            </td>
            <td>
                <input type="text" value="${m.memo || ''}" placeholder="사유 입력" 
                       style="width:110px; border:1px solid #ddd; padding:4px;"
                       onchange="window.updateMemo(${idx}, this.value)">
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

window.addMember = async function() {
    const nameInput = document.getElementById("memberName");
    const name = nameInput.value.trim();
    if (!name) return;

    const comp = companies[currentTab];
    comp.members.push({ name: name, passCount: 0, warningCount: 0, status: "active", memo: "", checked: false });
    nameInput.value = "";
    renderActiveCompany();
    await saveData();
};

window.bulkRegister = async function() {
    const bulkInput = document.getElementById("bulkNames");
    const rawNames = bulkInput.value.split("\n");
    const comp = companies[currentTab];

    rawNames.forEach(raw => {
        const name = raw.trim();
        if (name) comp.members.push({ name: name, passCount: 0, warningCount: 0, status: "active", memo: "", checked: false });
    });

    bulkInput.value = "";
    renderActiveCompany();
    await saveData();
};

window.deleteMember = async function(idx) {
    if (!confirm("삭제하시겠습니까?")) return;
    const comp = companies[currentTab];
    comp.members.splice(idx, 1);
    if (comp.currentIndex >= comp.members.length) comp.currentIndex = 0;
    renderActiveCompany();
    await saveData();
};

window.modifyItem = async function(idx, type, amount) {
    const m = companies[currentTab].members[idx];
    if (type === 'warning') {
        if (amount > 0) { if (m.passCount > 0) m.passCount--; else m.warningCount++; }
        else { if (m.warningCount > 0) m.warningCount--; }
    } else if (type === 'pass') {
        if (amount > 0) { if (m.warningCount > 0) m.warningCount--; else if (m.passCount < 3) m.passCount++; }
        else { if (m.passCount > 0) m.passCount--; }
    }
    renderActiveCompany();
    await saveData();
};

// 🚀 미참 선택 시 즉시 '다음 대상' 리프레시 반영 로직
window.changeStatus = async function(idx, value) {
    const comp = companies[currentTab];
    comp.members[idx].status = value;
    if (value === "active") { comp.members[idx].memo = ""; comp.members[idx].checked = false; }
    
    renderActiveCompany(); // 변경값 기반으로 상단 '다음 대상' 즉시 다시 계산
    await saveData();
};

window.updateMemo = async function(idx, value) {
    companies[currentTab].members[idx].memo = value;
    await saveData();
};

window.assignDuty = async function() {
    const comp = companies[currentTab];
    let N = parseInt(document.getElementById("assignCount").value) || 1;
    if (comp.members.length === 0) return;

    comp.members.forEach(m => m.checked = false);
    let assignedCount = 0;

    for (let i = 0; i < comp.members.length; i++) {
        if (assignedCount >= N) break;
        let m = comp.members[i];
        if (m.status === "active" && m.warningCount > 0) { m.checked = true; m.warningCount--; assignedCount++; }
    }

    let loopGuard = 0;
    const activeAvailable = comp.members.filter(m => m.status === "active" && !m.checked);

    while (assignedCount < N && activeAvailable.length > 0 && loopGuard < comp.members.length * 2) {
        loopGuard++;
        let currentMember = comp.members[comp.currentIndex];

        if (currentMember.status === "inactive" || currentMember.checked) {
            comp.currentIndex = (comp.currentIndex + 1) % comp.members.length;
            continue;
        }

        if (currentMember.passCount > 0) {
            currentMember.passCount--;
            comp.currentIndex = (comp.currentIndex + 1) % comp.members.length;
            continue;
        }

        currentMember.checked = true;
        assignedCount++;
        comp.currentIndex = (comp.currentIndex + 1) % comp.members.length;
    }

    renderActiveCompany();
    await saveData();
};

window.shuffleDuty = async function() {
    const comp = companies[currentTab];
    let N = parseInt(document.getElementById("assignCount").value) || 1;
    let activeIndices = [];
    
    comp.members.forEach((m, idx) => {
        m.checked = false;
        if (m.status === "active") activeIndices.push(idx);
    });

    if (activeIndices.length === 0) return;

    for (let i = activeIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeIndices[i], activeIndices[j]] = [activeIndices[j], activeIndices[i]];
    }

    let finalCount = Math.min(N, activeIndices.length);
    for (let i = 0; i < finalCount; i++) { comp.members[activeIndices[i]].checked = true; }

    renderActiveCompany();
    await saveData();
};

initSystem();
        currentTab = parseInt(e.target.value);
        renderActiveCompany();
    });

    document.getElementById("addMemberBtn").addEventListener("click", window.addMember);
    document.getElementById("memberName").addEventListener("keypress", (e) => {
        if (e.key === "Enter") window.addMember();
    });

    document.getElementById("bulkRegisterBtn").addEventListener("click", window.bulkRegister);
    document.getElementById("assignBtn").addEventListener("click", window.assignDuty);
    document.getElementById("shuffleBtn").addEventListener("click", window.shuffleDuty);
}

function renderActiveCompany() {
    const comp = companies[currentTab];
    if (!comp) return;

    let nextName = "없음";
    if (comp.members.length > 0) {
        let idx = comp.currentIndex;
        let found = false;
        for (let i = 0; i < comp.members.length; i++) {
            let checkIdx = (idx + i) % comp.members.length;
            if (comp.members[checkIdx].status === "active") {
                nextName = comp.members[checkIdx].name;
                found = true;
                break;
            }
        }
        if (!found) nextName = "가용 인원 없음";
    }
    document.getElementById("nextTarget").innerText = nextName;

    const tableBody = document.getElementById("memberTableBody");
    tableBody.innerHTML = "";

    comp.members.forEach((m, idx) => {
        const tr = document.createElement("tr");

        if (m.status === "inactive") {
            tr.className = "status-absent";
        } else if (m.checked) {
            tr.className = "status-confirmed";
        } else if (idx === comp.currentIndex && m.status === "active") {
            tr.className = "status-pending";
        }

        const warningIcons = "⚠️".repeat(m.warningCount);
        const passIcons = "🚫".repeat(m.passCount);

        tr.innerHTML = `
            <td>${m.status === 'inactive' ? '❌ 열외' : (m.checked ? '✅ 확정' : '⏳ 대기')}</td>
            <td>
                <strong>${m.name}</strong> 
                ${(idx === comp.currentIndex && m.status === "active") ? '<span style="color:red; font-size:11px;">[현재순번]</span>' : ''}
            </td>
            <td>${warningIcons || '-'}</td>
            <td>${passIcons || '-'}</td>
            <td>
                <select onchange="window.changeStatus(${idx}, this.value)">
                    <option value="active" ${m.status === 'active' ? 'selected' : ''}>참여</option>
                    <option value="inactive" ${m.status === 'inactive' ? 'selected' : ''}>미참여</option>
                </select>
            </td>
            <td>
                <input type="text" value="${m.memo || ''}" placeholder="사유 입력" 
                       style="width:100%; border:1px solid #ddd; padding:4px;"
                       onchange="window.updateMemo(${idx}, this.value)">
            </td>
            <td>
                <button onclick="window.modifyItem(${idx}, 'warning', 1)">⚠️+</button>
                <button onclick="window.modifyItem(${idx}, 'warning', -1)">⚠️-</button>
                <button onclick="window.modifyItem(${idx}, 'pass', 1)">🚫+</button>
                <button onclick="window.modifyItem(${idx}, 'pass', -1)">🚫-</button>
            </td>
            <td>
                <button style="background:#ffcdd2; border:1px solid #f44336; padding:3px 6px; border-radius:4px;" 
                        onclick="window.deleteMember(${idx})">삭제</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

window.addMember = async function() {
    const nameInput = document.getElementById("memberName");
    const name = nameInput.value.trim();
    if (!name) return;

    const comp = companies[currentTab];
    if (comp.members.length >= 30) { alert("중대 최대 인원은 30명입니다."); return; }

    comp.members.push({ name: name, passCount: 0, warningCount: 0, status: "active", memo: "", checked: false });
    nameInput.value = "";
    renderActiveCompany();
    await saveData();
};

window.bulkRegister = async function() {
    const bulkInput = document.getElementById("bulkNames");
    const rawNames = bulkInput.value.split("\n");
    const comp = companies[currentTab];

    for (let i = 0; i < rawNames.length; i++) {
        const name = rawNames[i].trim();
        if (!name) continue;
        if (comp.members.length >= 30) { alert(`최대 정원 초과로 일부만 등록되었습니다.`); break; }

        comp.members.push({ name: name, passCount: 0, warningCount: 0, status: "active", memo: "", checked: false });
    }

    bulkInput.value = "";
    renderActiveCompany();
    await saveData();
};

window.deleteMember = async function(idx) {
    if (!confirm("해당 대원을 명단에서 완전히 제거하시겠습니까?")) return;
    const comp = companies[currentTab];
    comp.members.splice(idx, 1);
    if (comp.currentIndex >= comp.members.length) comp.currentIndex = 0;
    renderActiveCompany();
    await saveData();
};

window.modifyItem = async function(idx, type, amount) {
    const m = companies[currentTab].members[idx];
    if (type === 'warning') {
        if (amount > 0) {
            if (m.passCount > 0) m.passCount--;
            else m.warningCount++;
        } else {
            if (m.warningCount > 0) m.warningCount--;
        }
    } else if (type === 'pass') {
        if (amount > 0) {
            if (m.warningCount > 0) m.warningCount--;
            else if (m.passCount < 3) m.passCount++;
        } else {
            if (m.passCount > 0) m.passCount--;
        }
    }
    renderActiveCompany();
    await saveData();
};

window.changeStatus = async function(idx, value) {
    const m = companies[currentTab].members[idx];
    m.status = value;
    if (value === "active") { m.memo = ""; m.checked = false; }
    renderActiveCompany();
    await saveData();
};

window.updateMemo = async function(idx, value) {
    companies[currentTab].members[idx].memo = value;
    await saveData();
};

window.assignDuty = async function() {
    const comp = companies[currentTab];
    let N = parseInt(document.getElementById("assignCount").value) || 1;
    if (comp.members.length === 0) return;

    comp.members.forEach(m => m.checked = false);
    let assignedCount = 0;

    for (let i = 0; i < comp.members.length; i++) {
        if (assignedCount >= N) break;
        let m = comp.members[i];
        if (m.status === "active" && m.warningCount > 0) {
            m.checked = true; m.warningCount--; assignedCount++;
        }
    }

    let loopGuard = 0;
    const activeAvailable = comp.members.filter(m => m.status === "active" && !m.checked);

    while (assignedCount < N && activeAvailable.length > 0 && loopGuard < comp.members.length * 2) {
        loopGuard++;
        let currentMember = comp.members[comp.currentIndex];

        if (currentMember.status === "inactive" || currentMember.checked) {
            comp.currentIndex = (comp.currentIndex + 1) % comp.members.length;
            continue;
        }

        if (currentMember.passCount > 0) {
            currentMember.passCount--;
            comp.currentIndex = (comp.currentIndex + 1) % comp.members.length;
            continue;
        }

        currentMember.checked = true;
        assignedCount++;
        comp.currentIndex = (comp.currentIndex + 1) % comp.members.length;
    }

    renderActiveCompany();
    await saveData();
    if (assignedCount < N) alert(`가용 대원이 부족하여 ${assignedCount}명만 배정되었습니다.`);
};

window.shuffleDuty = async function() {
    const comp = companies[currentTab];
    let N = parseInt(document.getElementById("assignCount").value) || 1;
    let activeIndices = [];
    
    comp.members.forEach((m, idx) => {
        m.checked = false;
        if (m.status === "active") activeIndices.push(idx);
    });

    if (activeIndices.length === 0) return;

    for (let i = activeIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeIndices[i], activeIndices[j]] = [activeIndices[j], activeIndices[i]];
    }

    let finalCount = Math.min(N, activeIndices.length);
    for (let i = 0; i < finalCount; i++) {
        comp.members[activeIndices[i]].checked = true;
    }

    renderActiveCompany();
    await saveData();
};

initSystem();
