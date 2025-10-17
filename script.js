:root {
  --deep-purple: #2E0854;
  --black: #000000;
  --gold: #FFD700;
  --card-bg: rgba(20,8,25,0.6);
  --glass: rgba(255,255,255,0.03);
}

.gold-text { 
  color: var(--gold); 
}

.app-container {
  background: linear-gradient(180deg, rgba(10,5,18,0.85), rgba(6,2,12,0.9));
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  border-radius: 18px;
  border-image-source: linear-gradient(90deg, var(--gold), #e2b000);
  border-image-slice: 1;
  backdrop-filter: blur(6px);
  /* CRITICAL: Make app container clickable */
  pointer-events: auto !important;
  position: relative;
  z-index: 1;
}

.action-button {
  transition: transform .15s ease, box-shadow .15s ease;
  box-shadow: 0 6px 18px rgba(0,0,0,0.6);
  cursor: pointer;
  /* CRITICAL: Make buttons clickable */
  pointer-events: auto !important;
  position: relative;
  z-index: 2;
}

.action-button:hover { 
  transform: translateY(-4px); 
}

.action-button:active {
  transform: translateY(-1px);
}

#three-container { 
  position: fixed; 
  inset: 0; 
  z-index: -1;
  /* CRITICAL: Prevent Three.js from blocking clicks */
  pointer-events: none !important;
}

.task-item {
  border-right: 4px solid var(--gold);
  background: linear-gradient(180deg, rgba(32,10,50,0.5), rgba(20,6,40,0.6));
  padding: 0.75rem;
  border-radius: 12px;
}

.task-done {
  opacity: 0.7;
  text-decoration: line-through;
  filter: grayscale(.2);
}

.app-container .border { 
  border-color: rgba(255, 215, 0, 0.12); 
}

.bg-gold { 
  background: var(--gold); 
}

.hidden { 
  display: none !important; 
}

/* Make all interactive elements clickable */
button, 
input, 
a, 
textarea, 
select,
form {
  pointer-events: auto !important;
  position: relative;
  z-index: 2;
  cursor: pointer;
}

input[type="text"],
input[type="date"],
input[type="time"],
textarea {
  cursor: text;
}

/* Style date/time pickers for dark theme */
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}

/* Scrollbar styling */
#tasks-list::-webkit-scrollbar {
  width: 6px;
}

#tasks-list::-webkit-scrollbar-track {
  background: rgba(255, 215, 0, 0.1);
  border-radius: 3px;
}

#tasks-list::-webkit-scrollbar-thumb {
  background: var(--gold);
  border-radius: 3px;
}

#tasks-list::-webkit-scrollbar-thumb:hover {
  background: #e2b000;
}
