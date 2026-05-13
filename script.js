console.log("script loaded");

let reportMembers = {};

let MY_FACTION_ID = 50723;
let AMOUNT = 10;

window.addEventListener("load", () => {
    console.log("DOM ready");

    if (document.getElementById("index-page")) {
        checkExistingAPI();
    }
    else if (document.getElementById("part-page")) {
        fetchWars();
    }
});

window.addEventListener("error", (e) => {
    alert("Something went wrong. Please make sure your API key is correct");
    console.error(e.error);
});

window.addEventListener("unhandledrejection", (e) => {
    alert("Something went wrong. Please make sure your API key is correct");
    console.error(e.reason);
});

function homepage() {
    window.location.href = "index.html";
}

function moveToCalc() {
    window.location.href = "calc.html";
}

function moveToPart() {
    window.location.href = "part.html";
}

function getKey() {
    return localStorage.getItem("apiKey");
}

function checkExistingAPI() {
    console.log("Checking for existing API...");
    if (localStorage.getItem("apiKey")) {
        document.getElementById("apiKeyInput").value = getKey();
        console.log("API key exists: ", getKey());
    }
    else {
        console.log("No API key exists");
    }
}

function setAPIKey() {
    const input = document.getElementById("apiKeyInput");
    let tempKey = input.value.trim();

    if (tempKey.length === 16) {
        document.querySelector(".nav-btns").classList.remove("hidden");
        document.querySelector(".spi").classList.add("hidden");
        localStorage.setItem("apiKey", tempKey);
        console.log("API Key set to:", getKey());
    }
    else {
        console.log("Invalid API Key");
        alert("Invalid API Key");
    }
}

function hidePopup() {
    var popup = document.getElementById("myPopup");
    popup.classList.remove("show")
}

async function fetchReport() {
    const warID = document.getElementById("warIdInput").value;
    console.log(`Fetching report for war ID: ${warID}...`);

    const data = await retrieveReport(warID);
    console.log(data);

    if (data.error) {
        var popup = document.getElementById("myPopup");
        popup.classList.toggle("show");
        console.log(data.error);
        return;
    }

    document.getElementById("calc-opp").innerText += data.opponentName;
    document.getElementById("calc-date").innerText = data.startTime;

    reportMembers = data.members;
    for (const member of reportMembers) {
        member.penaltyFlat = 0;
        member.penaltyPercent = 0;
        member.penaltyHits = 0;
        member.payBeforePenalty = 0;
        member.penaltyAbs = 0;
        member.finalPay = 0;
    }

    document.getElementById("initial-screen").classList.add("hidden");
    document.getElementById("payment-input").classList.remove("hidden");

    console.log("reportMembers: ", reportMembers);
}

function addPenaltyRow() {
    console.log("Adding penalty row");
    const tbody = document.getElementById("penaltyBody");
    const row = document.createElement("tr");

    //TYPE
    const typeCell = document.createElement("td");
    typeCell.innerHTML = `
        <select class="pen-type">
            <option value="flat">Flat Fee</option>
            <option value="percent">Percentage</option>
            <option value="hit">Hits</option>
        </select>
    `;
    
    //MEMBER
    const memberCell = document.createElement("td");
    const select = document.createElement("select");
    select.classList.add("pen-member");

    reportMembers.forEach(m => {
        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = m.name;
        select.appendChild(option);
    });

    memberCell.appendChild(select);

    //VALUE
    const valueCell = document.createElement("td");
    valueCell.innerHTML = `<input type="number" class="pen-value" min="1" placeholder="Enter value">`;

    //DELETE
    const deleteCell = document.createElement("td");
    deleteCell.innerHTML = 
        `<button class="del-btn" onclick="this.closest('tr').remove()">Del</button>`;
        
    row.appendChild(typeCell);
    row.appendChild(memberCell);
    row.appendChild(valueCell);
    row.appendChild(deleteCell);
    tbody.appendChild(row);
}

function calculatePayments() {
    let payPerHit = Number(document.getElementById("payPer").value);

    if (isNaN(payPerHit) || payPerHit <= 0) {
        alert("Please enter a valid positive number for Pay Per Hit.");
        return;
    }

    const rows = document.querySelectorAll("#penaltyBody tr");

    rows.forEach(row => {
        const type = row.querySelector(".pen-type").value;
        const memID = row.querySelector(".pen-member").value;
        const value = Number(row.querySelector(".pen-value").value);
        const member = reportMembers.find(m => m.id == memID);
        console.log(`Processing penalty - Type: ${type}, Member: ${member.name} [${memID}], Value: ${value}`);

        if (type === "flat") {
            member.penaltyFlat = value;
        }
        else if (type === "percent") {
            member.penaltyPercent = value;
        }
        else if (type === "hit") {
            member.penaltyHits = value;
        }
    });

    reportMembers.forEach(m => {
        m.payBeforePenalty = m.attacks * payPerHit;

        if (m.penaltyFlat > 0) {
            m.penaltyAbs = m.penaltyFlat;
        }

        if (m.penaltyPercent > 0) {
            m.penaltyAbs = m.payBeforePenalty * (m.penaltyPercent / 100);
        }

        if (m.penaltyHits > 0) {
            m.penaltyAbs = m.penaltyHits * payPerHit;
        }

        m.finalPay = Math.floor(m.payBeforePenalty - m.penaltyAbs);
    });

    console.log("Final reportMembers with calculated payments: ", reportMembers);
    document.getElementById("payment-input").classList.add("hidden");
    document.getElementById("results").classList.remove("hidden");

    const table = document.getElementById("payTable");

    table.innerHTML = 
    `<tr>
        <th>Member</th>
        <th>Penalty</th>
        <th>Final Pay</th>
        <th>Readable</th>
    </tr>`;

    reportMembers.forEach(m => {
        const row = document.createElement("tr");
        row.classList.add("member-row");

        let readable;

        if (m.finalPay >= 1000000) {
            readable = (m.finalPay/1000000).toString() + "m";
        }
        else if (m.finalPay >= 1000) {
            readable = (m.finalPay/1000).toString() + "k";
        }
        else {
            readable = m.finalPay.toString();
        }

        let penaltyClass = "";
        let operator = "";
        if (m.penaltyAbs > 0) {
            penaltyClass = "redCell";
            operator = "-";
        }

        row.innerHTML =
        `<td>${m.name} [${m.id}]</td>

        <td class="${penaltyClass}">${operator}${m.penaltyAbs.toLocaleString()}</td>

        <td class="greenCell">${m.finalPay.toLocaleString()}</td>

        <td>${readable}</td>`;

        table.appendChild(row);
    });

    table.addEventListener("click", (e) => {
        const row = e.target.closest(".member-row");
        if (!row) return;
        row.classList.toggle("selected-row");
    })
}

async function retrieveReport(warID) {
    const response = await (await fetch(buildReportURL(warID), {
        headers: {
            "accept": "application/json"
        }
    })).json();

    if(response.error) {
        return response;
    }

    const myFac = response.rankedwarreport.factions.find(f => f.id === MY_FACTION_ID);
    const theirFac = response.rankedwarreport.factions.find(f => f.id !== MY_FACTION_ID);
    const members = myFac.members.map(m => ({
        id: m.id,
        name: m.name,
        attacks: m.attacks
    }));

    members.sort((a, b) => b.attacks - a.attacks);

    const date = formatDate(response.rankedwarreport.start);

    return {
            opponentName: theirFac.name,
            startTime: date,
            members: members
        };
}

async function fetchWars() {
    const data = await retrieveRecentWar();

    if (data.error) {
        console.log("API error in fW: ", data.message);
        alert("Something went wrong. Please make sure your API key is correct");
        return;
    }
    console.log(data);

    const wars = data.wars;
    const members = data.members;
    const table = document.getElementById("WarTable");

    wars.sort((a, b) => a.id - b.id);
    members.sort((a, b) => b.totalAttacks - a.totalAttacks);

    const mvpByWar = {};

    for (const war of wars) {
        let max = -1;
        let mvpMembers = [];

        for (const member of members) {
            const attacks = member.wars?.[war.id];

            if (attacks===null) continue;

            if (attacks > max) {
                max = attacks;
                mvpMembers = [member.id];
            }
            else if (attacks === max) {
                mvpMembers.push(member.id);
            }
        }
        mvpByWar[war.id] = mvpMembers;
    }
    let header = "<tr>";
    header += "<th>Member</th>";

    for (const war of wars) {
        header += `<th>
        ${war.opp}<br>
        ${war.start}
        </th>`
    }

    header += "<th>Total</th></tr>"
    table.innerHTML += header;

    for (const member of members) {
        let row = `<tr class="member-row">`;
        row += `<td>${member.name} [${member.id}]</td>`;

        for (const war of wars) {
            const attacks = member.wars?.[war.id];

            let cellContent = attacks ?? "N/A";
            let cellClass = "";
            if (mvpByWar[war.id]?.includes(member.id)) {
                cellClass = "mvp";
            }
            else if (attacks === null) {
                cellClass = "na-cell";
            }

            row += `<td class="${cellClass}">${cellContent}</td>`;
        }

        row += `<td>${member.totalAttacks}</td></tr>`;
        table.innerHTML += row;
    }

    document.getElementById("WarTable").addEventListener("click", (e) => {
        const row = e.target.closest("tr.member-row");
        if (!row) return;
        document.querySelectorAll(".selected-row")
            .forEach(r => r.classList.remove("selected-row"));
        row.classList.add("selected-row");
    })
}

async function retrieveRecentWar() {
    try {

        let response = await (await fetch(buildWarURL(0), {
            headers: {
                "accept": "application/json"
            }
        })).json();

        if (response.rankedwars[0].winner === null) {
            response = await (await fetch(buildWarURL(1), {
                headers: {
                    "accept": "application/json"
                }
            })).json();
            console.log("Re-fetch complete")
        }
        else {
            console.log("Initial fetch fine")
        }

        const wars=[];

        for (const war of response.rankedwars) {

            const oppFaction = war.factions.find(f => f.id !== MY_FACTION_ID);

            const date = formatDate(war.start);

            wars.push({
                id: war.id,
                start: date,
                opp: oppFaction.name
            });
        }

        const members = {};

        for (const war of wars) {

            const repResponse = await (await fetch(buildReportURL(war.id), {
                headers: {
                    "accept": "application/json"
                }
            })).json();

            const myFac = repResponse.rankedwarreport.factions.find(f => f.id === MY_FACTION_ID);
            const cleanedMembers = myFac.members.map(m => ({
                id: m.id,
                name: m.name,
                attacks: m.attacks
            }));

            for (const member of cleanedMembers) {

                if(!members[member.id]) {

                    members[member.id] = {
                        id: member.id,
                        name: member.name,
                        totalAttacks: 0,
                        wars: {}
                    };
                    
                }
                
                members[member.id].totalAttacks += member.attacks;
                members[member.id].wars[war.id] = member.attacks;
            }
        }

        for (const member of Object.values(members)) {
            for(const war of wars) {
                if(!(war.id in member.wars)) {
                    member.wars[war.id] = null;
                }
            }
        }

        return {
            wars: wars,
            members: Object.values(members)
        };

    } catch (error) {

        console.error("API error in rRW: ". error);
        return {error: true, message: error.message};
        
    }
}

function buildWarURL(offset) {
    const URL = `https://api.torn.com/v2/faction/${MY_FACTION_ID}/rankedwars?offset=${offset}&limit=${AMOUNT}&key=${getKey()}`;
    return URL;
}

function buildReportURL(id) {
    const URL = `https://api.torn.com/v2/faction/${id}/rankedwarreport?key=${getKey()}`;
    return URL;
}

function formatDate(s) {
    const d = new Date(s * 1000);
    const formattedDate =
      String(d.getUTCDate()).padStart(2, '0') + '/' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '/' +
      String(d.getUTCFullYear()).slice(-2) + ' ' +
      String(d.getUTCHours()).padStart(2, '0') + ':' +
      String(d.getUTCMinutes()).padStart(2, '0') + ' TCT';

    return formattedDate;
}