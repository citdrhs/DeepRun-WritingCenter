const API_URL = "https://script.google.com/macros/s/AKfycby5s1lUpuESxP81rBx-ACe-mxDYMlL03qvyOKPyoGeGG4VEAwMjGiVq0fiAFGqfxAw7PQ/exec";

function showMessage(id, message, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#ffb4b4" : "#9fb4ff";
}

async function apiGet(action, params) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.entries(params || {}).forEach(function (entry) {
    const [k, v] = entry;
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    method: "GET"
  });
  if (!res.ok) throw new Error("Request failed: " + res.status);
  return res.json();
}

async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: action, payload: payload })
  });
  if (!res.ok) throw new Error("Request failed: " + res.status);
  return res.json();
}

// ── Signup form (signups.html) ────────────────────────────────────────────────

function renderTeacherOptions(teachers) {
  const select = document.getElementById("signup-teacher-email");
  if (!select) return;
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a teacher";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);
  teachers.forEach(function (teacher) {
    const option = document.createElement("option");
    option.value = teacher.email;
    option.textContent = teacher.name + " (" + teacher.email + ")";
    select.appendChild(option);
  });
}

async function loadTeachers() {
  try {
    const data = await apiGet("teachers");
    renderTeacherOptions(data.teachers || []);
  } catch (err) {
    const select = document.getElementById("signup-teacher-email");
    if (select) {
      select.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Could not load teachers";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
    }
  }
}

function bindSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    showMessage("signup-message", "Submitting...", false);

    const fd = new FormData(form);
    const firstName = fd.get("firstName") || "";
    const lastName = fd.get("lastName") || "";
    const studentName = (firstName + " " + lastName).trim();

    try {
      const res = await apiPost("submitSignup", {
        student_name: studentName,
        student_email: fd.get("studentEmail"),
        student_grade: fd.get("studentGrade"),
        appointment_date: fd.get("appointmentDateTime"),
        teacher_email: fd.get("teacherEmail"),
        dual_enroll: fd.get("dualEnroll") === "true"
      });

      if (res.ok) {
        showMessage("signup-message", "Sign-up submitted! Confirmation ID: " + res.consult_id, false);
        form.reset();
      } else {
        showMessage("signup-message", res.error || "Submission failed.", true);
      }
    } catch (err) {
      showMessage("signup-message", err.message, true);
    }
  });
}

// ── Consultant form (consultant-form.html) ────────────────────────────────────

async function loadSignupOptions() {
  const select = document.getElementById("consult-id-select");
  if (!select) return;

  try {
    const data = await apiGet("signupOptions");
    const options = data.options || [];

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = options.length ? "Choose a sign-up" : "No open sign-ups";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    options.forEach(function (opt) {
      const option = document.createElement("option");
      option.value = opt.consult_id;
      option.textContent = opt.label;
      select.appendChild(option);
    });
  } catch (err) {
    select.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Could not load sign-ups";
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
  }
}

function bindConsultationForm() {
  const form = document.getElementById("consultant-form");
  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    showMessage("consultant-message", "Submitting...", false);

    const fd = new FormData(form);
    try {
      const res = await apiPost("submitConsultation", {
        consult_id: fd.get("consultId"),
        consultant: fd.get("consultantName"),
        before_conf: fd.get("beforeConfidence"),
        after_conf: fd.get("afterConfidence"),
        duration: Number(fd.get("duration")),
        due_date: fd.get("dueDate"),
        notes: fd.get("workedOn"),
        next_steps: fd.get("nextSteps")
      });

      if (res.ok) {
        showMessage("consultant-message", "Submitted! Consultation ID: " + res.consult_id, false);
        form.reset();
        await loadSignupOptions();
      } else {
        showMessage("consultant-message", res.error || "Submission failed.", true);
      }
    } catch (err) {
      showMessage("consultant-message", err.message, true);
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async function () {
  // Signup page
  if (document.getElementById("signup-form")) {
    bindSignupForm();
    await loadTeachers();
  }

  // Consultant form page
  if (document.getElementById("consultant-form")) {
    bindConsultationForm();
    await loadSignupOptions();
  }
});
