function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const btn = document.getElementById("btn-sidebar");

  const isVisible = !sidebar.classList.contains("-translate-x-full");

  if (isVisible) {
    sidebar.classList.add("-translate-x-full");
    backdrop.classList.add("hidden");
    btn.classList.remove("hidden");
  } else {
    sidebar.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
    btn.classList.add("hidden");
  }
}

function closeSidebar() {
  document.getElementById("sidebar").classList.add("-translate-x-full");
  document.getElementById("sidebar-backdrop").classList.add("hidden");
  document.getElementById("btn-sidebar").classList.remove("hidden");
}