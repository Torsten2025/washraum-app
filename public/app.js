const sessionLabel = document.getElementById("sessionLabel");
const logoutButton = document.getElementById("logoutButton");
const bookingForm = document.getElementById("bookingForm");
const resourceTypeInput = document.getElementById("resourceType");
const resourceIdInput = document.getElementById("resourceId");
const startAtInput = document.getElementById("startAt");
const endAtInput = document.getElementById("endAt");
const formMessage = document.getElementById("formMessage");
const bookingFilter = document.getElementById("bookingFilter");
const bookingsList = document.getElementById("bookingsList");

const resources = {
  washer: ["WM-1", "WM-2"],
  drying_room: ["TR-1", "TR-2"]
};

let authToken = sessionStorage.getItem("washraumAuthToken");
let userName = sessionStorage.getItem("washraumUserName");
let role = sessionStorage.getItem("washraumUserRole") || "user";

if (!authToken) {
  window.location.href = "/login.html";
}

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", {
    method: "POST",
    headers: authHeaders()
  });
  sessionStorage.removeItem("washraumUserName");
  sessionStorage.removeItem("washraumUserRole");
  sessionStorage.removeItem("washraumAuthToken");
  window.location.href = "/login.html";
});

resourceTypeInput.addEventListener("change", updateResourceOptions);
bookingFilter.addEventListener("change", loadBookings);

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const body = {
    resourceType: resourceTypeInput.value,
    resourceId: resourceIdInput.value,
    startAt: startAtInput.value,
    endAt: endAtInput.value
  };

  const response = await fetch(role === "admin" ? "/api/admin/addBooking" : "/api/bookings", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    formMessage.textContent = messageForError(data.error);
    return;
  }

  bookingForm.reset();
  updateResourceOptions();
  formMessage.textContent = "Buchung gespeichert.";
  await loadBookings();
});

function updateResourceOptions() {
  const selectedType = resourceTypeInput.value;
  resourceIdInput.innerHTML = "";

  for (const resourceId of resources[selectedType]) {
    const option = document.createElement("option");
    option.value = resourceId;
    option.textContent = resourceId;
    resourceIdInput.append(option);
  }
}

async function loadBookings() {
  const response = await fetch("/api/bookings");
  const data = await response.json();
  const filter = bookingFilter.value;
  const bookings = data.bookings.filter((booking) => {
    return filter === "all" || booking.resource_type === filter;
  });

  bookingsList.innerHTML = "";

  if (bookings.length === 0) {
    bookingsList.textContent = "Keine Buchungen vorhanden.";
    return;
  }

  for (const booking of bookings) {
    const item = document.createElement("article");
    item.className = "booking-item";

    const title = document.createElement("h3");
    title.textContent = `${resourceLabel(booking.resource_type)} ${booking.resource_id}`;

    const meta = document.createElement("p");
    meta.textContent = `${formatDate(booking.start_at)} bis ${formatDate(booking.end_at)} - ${booking.user_name}`;

    item.append(title, meta);

    if (role === "admin" || booking.user_name === userName) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Loeschen";
      deleteButton.addEventListener("click", () => deleteBooking(booking.id));
      item.append(deleteButton);
    }

    bookingsList.append(item);
  }
}

async function deleteBooking(id) {
  const response = await fetch("/api/user/deleteBooking", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ id })
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    formMessage.textContent = messageForError(data.error);
    return;
  }

  await loadBookings();
}

function resourceLabel(type) {
  return type === "washer" ? "Waschmaschine" : "Trockenraum";
}

function authHeaders() {
  return {
    "Authorization": `Bearer ${authToken}`,
    "Content-Type": "application/json"
  };
}

async function loadSession() {
  const response = await fetch("/api/session", {
    headers: authHeaders()
  });

  if (!response.ok) {
    sessionStorage.removeItem("washraumUserName");
    sessionStorage.removeItem("washraumUserRole");
    sessionStorage.removeItem("washraumAuthToken");
    window.location.href = "/login.html";
    return false;
  }

  const data = await response.json();
  userName = data.user.userName;
  role = data.user.role;
  sessionStorage.setItem("washraumUserName", userName);
  sessionStorage.setItem("washraumUserRole", role);
  sessionLabel.textContent = `${userName} (${role})`;

  return true;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function messageForError(error) {
  const messages = {
    missing_required_fields: "Bitte alle Felder ausfuellen.",
    missing_login_fields: "Bitte Name und Passwort eingeben.",
    invalid_login: "Name oder Passwort stimmt nicht.",
    not_authenticated: "Bitte neu einloggen.",
    admin_required: "Diese Aktion ist nur fuer Admins moeglich.",
    invalid_resource_type: "Unbekannter Bereich.",
    invalid_time_range: "Bitte Start und Ende pruefen.",
    sunday_not_allowed: "Am Sonntag sind keine Buchungen moeglich.",
    only_one_future_booking_allowed: "Bitte nur 1 x im Voraus eintragen.",
    time_range_already_booked: "Dieser Zeitraum ist bereits belegt.",
    booking_id_required: "Keine Buchung ausgewaehlt.",
    booking_not_found: "Buchung nicht gefunden.",
    not_allowed: "Diese Buchung kann nicht geloescht werden."
  };

  return messages[error] || "Die Aktion konnte nicht ausgefuehrt werden.";
}

async function boot() {
  const validSession = await loadSession();
  if (!validSession) {
    return;
  }

  updateResourceOptions();
  await loadBookings();
}

boot();
