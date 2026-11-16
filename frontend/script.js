const API_URL = "http://127.0.0.1:5000";

function timeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);

  const seconds = Math.floor((now - past) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute(s) ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour(s) ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day(s) ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month(s) ago`;

  const years = Math.floor(months / 12);
  return `${years} year(s) ago`;
}

document.getElementById("signupButton").addEventListener("click", async () => {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const role = document.getElementById("signupRole").value;
  const password = document.getElementById("signupPassword").value;

  const message = document.getElementById("signupMessage");

  if (!name || !email || !phone || !password) {
    message.textContent = "Please fill all fields.";
    message.style.color = "red";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        role,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      message.textContent = data.message;
      message.style.color = "green";
    } else {
      message.textContent = data.error || "Signup failed.";
      message.style.color = "red";
    }
  } catch (error) {
    message.textContent = "Cannot connect to server.";
    message.style.color = "red";
  }
});

document.getElementById("loginButton").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const message = document.getElementById("loginMessage");

  if (!email || !password) {
    message.textContent = "Please enter email and password.";
    message.style.color = "red";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("userEmail", email);
      localStorage.setItem("token", data.access_token);
      message.textContent = data.message;
      message.style.color = "green";
    } else {
      message.textContent = data.error || "Login failed.";
      message.style.color = "red";
    }
  } catch (error) {
    message.textContent = "Cannot connect to server.";
    message.style.color = "red";
  }
});

document.getElementById("reportButton").addEventListener("click", async () => {
  const disasterType = document.getElementById("reportType").value;
  const location = document.getElementById("reportLocation").value.trim();
  const description = document.getElementById("reportDescription").value.trim();
  const priority = document.getElementById("reportPriority").value;
  const message = document.getElementById("reportMessage");

  if (!location || !description) {
    message.textContent = "Please enter location and description.";
    message.style.color = "red";
    return;
  }

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    user_id: 1,
    disaster_type: disasterType,
    location,
    description,
    priority
  })
});

    const data = await response.json();

    if (response.ok) {
      message.textContent = data.message;
      message.style.color = "green";
      document.getElementById("reportLocation").value = "";
      document.getElementById("reportDescription").value = "";
      loadReports();
    } else {
      message.textContent = data.error || "Report submission failed.";
      message.style.color = "red";
    }
  } catch (error) {
    message.textContent = "Cannot connect to server.";
    message.style.color = "red";
  }
});

async function loadReports() {
  const reportsList = document.getElementById("reportsList");

  try {
    const email = localStorage.getItem("userEmail") || "";
    const token = localStorage.getItem("token");

    const priority = document.getElementById("filterPriority")?.value || "";

    const params = new URLSearchParams();
    params.append("email", email);

    if (priority) {
       params.append("priority", priority);
    }
    const response = await fetch(`${API_URL}/api/reports?${params.toString()}`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});
    if (!response.ok) {
  reportsList.innerHTML = "<p>Cannot load reports.</p>";
  return;
}
    const data = await response.json();

    reportsList.innerHTML = "";

    if (data.reports.length === 0) {
      reportsList.innerHTML = "<p>No reports yet.</p>";
      return;
    }
    const currentRole = data.current_role;

    data.reports.forEach(report => {
      const reportCard = document.createElement("div");
      reportCard.className = "report-card";
   

reportCard.innerHTML = `
  ${currentRole === "admin" ? '<span class="admin-badge">Admin View</span>' : '<span class="my-report-badge">My Report</span>'}
  <h3 class="report-title" data-id="${report.id}">${report.disaster_type}</h3>
  <p><strong>Location:</strong> ${report.location}</p>
  <p><strong>Description:</strong> ${report.description}</p>
  <p><strong>Status:</strong> <span class="report-status">${report.status}</span></p>
  <p><strong>Priority:</strong> <span class="priority-badge priority-${report.priority}">${report.priority}</span></p>
  <p><strong>Time:</strong> ${timeAgo(report.created_at)}</p>
  <p><strong>Reported by:</strong> ${report.user_name}</p>

  <label>Update Status</label>
  <select class="status-select" data-id="${report.id}">
    <option value="pending">Pending</option>
    <option value="in_progress">In Progress</option>
    <option value="resolved">Resolved</option>
  </select>

  <button class="status-button" data-id="${report.id}">Update Status</button>
  <button class="delete-button" data-id="${report.id}">Delete Report</button>
  <button class="edit-button" data-id="${report.id}">Edit Report</button>
`;

      reportsList.appendChild(reportCard);
    });
  } catch (error) {
    reportsList.innerHTML = "<p>Cannot load reports.</p>";
  }
}

loadReports();

document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("status-button")) {
    const reportId = event.target.getAttribute("data-id");
    const select = document.querySelector(`.status-select[data-id="${reportId}"]`);
    const status = select.value;

    try {
      const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports/${reportId}/status`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ status })
});

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        loadReports();
      } else {
        alert(data.error || "Status update failed.");
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  const message = document.getElementById("logoutMessage");

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/logout`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

    const data = await response.json();

    if (response.ok) {
      localStorage.removeItem("userEmail");
      localStorage.removeItem("token");
      message.textContent = data.message;
      message.style.color = "green";
    } else {
      message.textContent = "Logout failed.";
      message.style.color = "red";
    }
  } catch (error) {
    message.textContent = "Cannot connect to server.";
    message.style.color = "red";
  }
});

document.getElementById("filterButton").addEventListener("click", async () => {
  const email = localStorage.getItem("userEmail") || "";
  const disasterType = document.getElementById("filterType").value;
  const status = document.getElementById("filterStatus").value;
  const priority = document.getElementById("filterPriority").value;

  const params = new URLSearchParams();
  params.append("email", email);

  if (disasterType) params.append("disaster_type", disasterType);
  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);

  const reportsList = document.getElementById("reportsList");

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/api/reports?${params.toString()}`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

    if (!response.ok) {
      reportsList.innerHTML = "<p>Cannot load reports.</p>";
      return;
    }

    const data = await response.json();
    reportsList.innerHTML = "";

    if (data.reports.length === 0) {
      reportsList.innerHTML = "<p>No reports found.</p>";
      return;
    }

    const currentRole = data.current_role;

    data.reports.forEach(report => {
      const reportCard = document.createElement("div");
      reportCard.className = "report-card";

      reportCard.innerHTML = `
        ${currentRole === "admin" ? '<span class="admin-badge">Admin View</span>' : '<span class="my-report-badge">My Report</span>'}
        <h3>${report.disaster_type}</h3>
        <p><strong>Location:</strong> ${report.location}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Status:</strong> <span class="report-status">${report.status}</span></p>
        <p><strong>Priority:</strong> <span class="priority-badge priority-${report.priority}">${report.priority}</span></p>
        <p><strong>Time:</strong> ${timeAgo(report.created_at)}</p>
        <p><strong>Reported by:</strong> ${report.user_name}</p>

        <label>Update Status</label>
        <select class="status-select" data-id="${report.id}">
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <button class="status-button" data-id="${report.id}">Update Status</button>
        <button class="delete-button" data-id="${report.id}">Delete Report</button>
      `;

      reportsList.appendChild(reportCard);
    });
  } catch (error) {
    reportsList.innerHTML = "<p>Cannot load reports.</p>";
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("delete-button")) {
    const reportId = event.target.getAttribute("data-id");
    const email = localStorage.getItem("userEmail") || "";

    const confirmed = confirm("Are you sure you want to delete this report?");

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ email })
});

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        loadReports();
      } else {
        alert(data.error || "Delete failed.");
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("edit-button")) {
    const reportId = event.target.getAttribute("data-id");

    const location = prompt("Enter new location:");
    const description = prompt("Enter new description:");
    const priority = prompt("Enter priority (low/medium/high/critical):");

    const email = localStorage.getItem("userEmail") || "";

    try {
      const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    email,
    location,
    description,
    priority
  })
});

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        loadReports();
      } else {
        alert(data.error || "Update failed.");
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  }
});

document.getElementById("searchButton").addEventListener("click", async () => {
  const email = localStorage.getItem("userEmail") || "";
  const priority = document.getElementById("filterPriority")?.value || "";
  const search = document.getElementById("searchInput").value.trim();

  const reportsList = document.getElementById("reportsList");

  const params = new URLSearchParams();
  params.append("email", email);

  if (priority) {
    params.append("priority", priority);
  }

  if (search) {
    params.append("search", search);
  }

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports?${params.toString()}`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

    if (!response.ok) {
      reportsList.innerHTML = "<p>Cannot load reports.</p>";
      return;
    }

    const data = await response.json();
    reportsList.innerHTML = "";

    if (data.reports.length === 0) {
      reportsList.innerHTML = "<p>No reports found.</p>";
      return;
    }

    const currentRole = data.current_role;

    data.reports.forEach(report => {
      const reportCard = document.createElement("div");
      reportCard.className = "report-card";

      reportCard.innerHTML = `
        ${currentRole === "admin" ? '<span class="admin-badge">Admin View</span>' : '<span class="my-report-badge">My Report</span>'}
        <h3>${report.disaster_type}</h3>
        <p><strong>Location:</strong> ${report.location}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Status:</strong> <span class="report-status">${report.status}</span></p>
        <p><strong>Priority:</strong> <span class="priority-badge priority-${report.priority}">${report.priority}</span></p>
        <p><strong>Time:</strong> ${timeAgo(report.created_at)}</p>
        <p><strong>Reported by:</strong> ${report.user_name}</p>

        <label>Update Status</label>
        <select class="status-select" data-id="${report.id}">
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <button class="status-button" data-id="${report.id}">Update Status</button>
        <button class="delete-button" data-id="${report.id}">Delete Report</button>
      `;

      reportsList.appendChild(reportCard);
    });
  } catch (error) {
    reportsList.innerHTML = "<p>Cannot load reports.</p>";
  }
});

async function loadStats() {
  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/stats`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});
    const data = await response.json();

    document.getElementById("totalReports").textContent = data.total;
    document.getElementById("pendingReports").textContent = data.pending;
    document.getElementById("inProgressReports").textContent = data.in_progress;
    document.getElementById("resolvedReports").textContent = data.resolved;
  } catch (error) {
    console.error("Cannot load stats.");
  }
}

loadStats();

document.getElementById("adminLoginButton").addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value.trim();
  const message = document.getElementById("adminMessage");
  const usersList = document.getElementById("adminUsersList");

  if (!email) {
    message.textContent = "Please enter admin email.";
    message.style.color = "red";
    return;
  }

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/admin/users`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ email })
});
    const data = await response.json();

    if (response.ok) {
      message.textContent = "Admin access granted.";
      message.style.color = "green";

      usersList.innerHTML = "";

      data.users.forEach(user => {
        const userCard = document.createElement("div");
        userCard.className = "report-card";

        userCard.innerHTML = `
          <h3>${user.name}</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <p><strong>Created:</strong> ${user.created_at}</p>

          <label>Change Role</label>
          <select class="role-select" data-id="${user.id}">
            <option value="citizen">Citizen</option>
            <option value="volunteer">Volunteer</option>
            <option value="admin">Admin</option>
          </select>

          <button class="role-button" data-id="${user.id}">Update Role</button>
          <button class="delete-user-button" data-id="${user.id}">Delete User</button>
        `;

        usersList.appendChild(userCard);
      });
    } else {
      message.textContent = data.error || "Admin access denied.";
      message.style.color = "red";
    }
  } catch (error) {
    message.textContent = "Cannot connect to server.";
    message.style.color = "red";
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("report-title")) {
    const reportId = event.target.getAttribute("data-id");
    window.location.href = `report-details.html?id=${reportId}`;
  }
});

async function loadReportDetails() {
  const reportId = new URLSearchParams(window.location.search).get("id");

  const detailsDiv = document.getElementById("reportDetails");

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});
    const data = await response.json();

    if (!response.ok) {
      detailsDiv.innerHTML = "<p>Cannot load report details.</p>";
      return;
    }

    detailsDiv.innerHTML = `
  <h2>${data.disaster_type}</h2>
  <p><strong>Location:</strong> ${data.location}</p>
  <p><strong>Description:</strong> ${data.description}</p>
  <p><strong>Priority:</strong> <span class="priority-badge priority-${data.priority}">${data.priority}</span></p>
  <p><strong>Status:</strong> <span class="report-status">${data.status}</span></p>
  <p><strong>Time:</strong> ${timeAgo(data.created_at)}</p>
  <p><strong>Reported by:</strong> ${data.user_name}</p>
`;
  } catch (error) {
    detailsDiv.innerHTML = "<p>Cannot connect to server.</p>";
  }
}

document.getElementById("editReportButton")?.addEventListener("click", async () => {
  const reportId = new URLSearchParams(window.location.search).get("id");
  const email = localStorage.getItem("userEmail") || "";

  const location = prompt("Enter new location:");
  const description = prompt("Enter new description:");
  const priority = prompt("Enter priority (low/medium/high/critical):");

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    email,
    location,
    description,
    priority
  })
});

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      loadReportDetails();
    } else {
      alert(data.error || "Update failed.");
    }
  } catch (error) {
    alert("Cannot connect to server.");
  }
});

document.getElementById("deleteReportButton")?.addEventListener("click", async () => {
  const reportId = new URLSearchParams(window.location.search).get("id");
  const email = localStorage.getItem("userEmail") || "";

  const confirmed = confirm("Are you sure you want to delete this report?");

  if (!confirmed) return;

  try {
    const token = localStorage.getItem("token");

const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ email })
});

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      window.location.href = "index.html";
    } else {
      alert(data.error || "Delete failed.");
    }
  } catch (error) {
    alert("Cannot connect to server.");
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("role-button")) {
    const userId = event.target.getAttribute("data-id");
    const select = document.querySelector(`.role-select[data-id="${userId}"]`);
    const role = select.value;
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
      } else {
        alert(data.error || "Role update failed.");
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("delete-user-button")) {
    const userId = event.target.getAttribute("data-id");
    const token = localStorage.getItem("token");

    const confirmed = confirm("Are you sure you want to delete this user?");

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        document.getElementById("adminLoginButton").click();
      } else {
        alert(data.error || "Delete user failed.");
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  }
});

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");

  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  playSound(type);

  setTimeout(() => {
    toast.classList.add("hide");

    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 3000);
}

function playSound(type = "success") {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (type === "success") {
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
  } else if (type === "error") {
    oscillator.type = "square";
    oscillator.frequency.value = 220;
  } else {
    oscillator.type = "triangle";
    oscillator.frequency.value = 660;
  }

  gainNode.gain.value = 0.08;

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
}

if (window.location.pathname.includes("report-details.html")) {
  loadReportDetails();
}