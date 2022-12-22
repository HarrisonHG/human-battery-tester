import { Event } from './event.js';
import { EventList } from './event_list.js';

// ----- Main -----

// Events list according to the user.
let event_list = new EventList();
let energy_before_sleep = null;
let morning_energy_level = null;
let current_energy_level = null;
let sleep_event = new Event("Sleep", 50, false);

// ----- User Functions -----

// Save events to the user's local storage
function save_events() {

    // Read the UI
    parse_ui();

    // Use the overall gain/loss of the day to estimate the energy gain/loss of blank event values
    let total_gain = current_energy_level - morning_energy_level;
    let calculated_events = event_list.get_events_in_need_of_values();
    if (calculated_events.length > 0) {
        let average_gain = total_gain / calculated_events.length;
        for (let num in calculated_events) {
            let event_name = calculated_events[num].name;
            event_list.events[event_name].values.pop();
            event_list.events[event_name].values.push(average_gain);
        }
    }

    // Shove some goodies into local storage.
    localStorage.setItem("events", event_list.to_json());
    localStorage.setItem("energy_before_sleep", current_energy_level);
    localStorage.setItem("sleep_event", sleep_event.to_json());

    alert("Saved!");
}

// Load events from the user's local storage
// Automatically applies defaults for missing values and/or first time use.
export function load_events() {

    event_list = EventList.from_json(localStorage.getItem("events"));

    if (event_list === null) {
        // Completely new. Put some defaults in.
        event_list = new EventList();
    }
        
    energy_before_sleep = localStorage.getItem("energy_before_sleep");

    sleep_event = Event.from_json(localStorage.getItem("sleep_event"));
    if (sleep_event === null) {
        sleep_event = new Event("Sleep", 50, false);
    }

    // Summarize the load process
    console.log("Loaded events:");
    console.log(event_list);
    console.log("Energy before sleep: " + energy_before_sleep);
    console.log("Sleep event: ");
    console.log(sleep_event);

    console.log("Total number of events: " + event_list.get_event_count());



    // Update the UI
    set_ui_on_load();
}

function add_event_row() {
    let table = document.getElementById("eventsTable");
    let row = table.insertRow(-1);
    row.classList.add("d-flex");
    let name_cell = row.insertCell(0);
    let value_cell = row.insertCell(1);
    let remove_cell = row.insertCell(2);

    name_cell.classList.add("col");
    value_cell.classList.add("col-2");
    remove_cell.classList.add("col-1");

    name_cell.innerHTML = "<input type='text' class='eventNames form-control' list='previousEvents' placeholder='Oh snap! Then what?'>";
    value_cell.innerHTML = "<input type='number' class='eventValues form-control' placeholder='auto'>";
    remove_cell.innerHTML = "<button class='removeEventBtn form-control btn-danger' onclick=\"remove_event_row(this);\">-</button>";

    /// TODO: Fix this. Make it work here instead of in the HTML.
    // Add an event listener to the remove button
    // let remove_btn = remove_cell.getElementsByClassName("removeEventBtn")[0];
    // remove_btn.addEventListener("click", remove_event_row (row));

}

/// TODO: Fix this. Make it work here instead of in the HTML.
// function remove_event_row(btn) {
//     let row = btn.parentNode.parentNode;
//     row.parentNode.removeChild(row);
// }

function clear_all_events() {

    // Confirm the user wants to YEET ALL OF THEIR DATA INTO THE ABYSS
    if (!confirm("Are you absolutely deifnitely sure that you want to start from scratch?")) {
        return;
    }

    // Clear the current data
    event_list = new EventList();
    energy_before_sleep = null;
    current_energy_level = null;
    sleep_event = new Event("Sleep", 50, false);

    // Clean up the local storage
    localStorage.removeItem("events");
    localStorage.removeItem("energy_before_sleep");
    localStorage.removeItem("sleep_event");

    // Clear the UI
    document.getElementById("eventsTable").tbody.innerHTML =
    '<tr class="d-flex">' + 
    '<td class="col"><input type="text" class="form-control eventNames" list="previousEvents" placeholder="What happened, bro?"></td>' +
    '<td class="col-2"><input type="number" class="form-control eventValues" placeholder="auto" min="-100" max="100"></td>' +
    '<td class="col-1"><!-- No removing the first row. --></td>' +
    '</tr>';
    document.getElementById("batteryLevelStart").value = "50";
    document.getElementById("batteryLevelEnd").value = "50";
    document.getElementById("yesterdaysEnergyMention").innerHTML = "";
    document.getElementById("previousEvents").innerHTML = "";
}

// Time to calculate the user's energy expendature
function calculate_energy() {

    // Get the top 3 positive events
    let ordered_events = event_list.get_events_by_value();
    let top_three = ordered_events.slice(0, 3);
    for (let i = 0; i < top_three.length; i++) {
        if (top_three[i].estimate_value() <= 0) {
            // Remove the current event and all events after it, since we've 
            //  only got negative events left
            top_three = top_three.slice(0, i);
            break;
        }
    }

    // Get the top 3 negative events
    let bottom_three = ordered_events.slice(-3, ordered_events.length);
    for (let i = bottom_three.length-1; i >= 0; i--) {
        if (bottom_three[i].estimate_value() >= 0) {
            // Remove the current event and all events after it, since we've
            //  only got positive events left
            if (i === bottom_three.length-1) {
                bottom_three = [];
            } else {
                bottom_three = bottom_three.slice(i + 1);
            }
          
            break;
        }
    }

    // Get the top 3 impactful events
    let top_three_impact = event_list.get_events_by_impact();
    top_three_impact = top_three_impact.slice(0, 3);

    // What's the average sleep value?
    let average_sleep = sleep_event.estimate_value();

    // We have our data. Let's make some tables!

    // Top 3 positive events
    let top_three_table = document.getElementById("rechargeTable");
    top_three_table.children[1].innerHTML = "";
    if (top_three.length === 0) {
        top_three_table.innerHTML = 
            "<tr><td colspan='2'>You're not a single-use battery bro. You're worth " + 
            "more than that. Buy yourself an ice-cream and relax!</td></tr>";
    }
    else {
        for (let i = 0; i < top_three.length; i++) {
            let row = top_three_table.insertRow(-1);
            let name_cell = row.insertCell(0);
            let value_cell = row.insertCell(1);
            name_cell.innerHTML = top_three[i].name;
            value_cell.innerHTML = Math.round(top_three[i].estimate_value()) + "%";
        }        
    }

    // Top 3 negative events
    let bottom_three_table = document.getElementById("costTable");
    bottom_three_table.children[1].innerHTML = "";
    if (bottom_three.length === 0) {
        bottom_three_table.innerHTML = 
            "<tr><td colspan='2'>You have no draining events? Sick! How do you manage it, man?" + 
            "Can you do a Ted talk or something, because there are plenty strugglig out there, bro." +
            "</td></tr>";
    }
    else {
        for (let i = 0; i < bottom_three.length; i++) {
            let row = bottom_three_table.insertRow(-1);
            let name_cell = row.insertCell(0);
            let value_cell = row.insertCell(1);
            name_cell.innerHTML = bottom_three[i].name;
            value_cell.innerHTML = Math.round(bottom_three[i].estimate_value()) + "%";
        }        
    }

    // Top 3 impactful events
    let top_three_impact_table = document.getElementById("impactTable");
    top_three_impact_table.children[1].innerHTML = "";
    if (top_three_impact.length === 0) {
        top_three_impact_table.innerHTML = 
            "<tr><td colspan='2'>Nothing happened. At all. Ever.</td></tr>";
    }
    else {
        for (let i = 0; i < top_three_impact.length; i++) {
            let row = top_three_impact_table.insertRow(-1);
            let name_cell = row.insertCell(0);
            let value_cell = row.insertCell(1);
            name_cell.innerHTML = top_three_impact[i].name;
            value_cell.innerHTML = Math.round(top_three_impact[i].impact_value()) + "%";
        }
    }

    // Show the sleep quality
    document.getElementById("sleepQuality").innerHTML = average_sleep;

    // Finally, display a table of events and energy levels
    let result_events_table = document.getElementById("generalResultTable");
    result_events_table.children[1].innerHTML = "";
    ordered_events.forEach(function(event) {
        let row = result_events_table.insertRow(-1);
        let name_cell = row.insertCell(0);
        let value_cell = row.insertCell(1);
        name_cell.innerHTML = event.name;
        value_cell.innerHTML = Math.round(event.estimate_value()) + "%";
    });

    document.getElementById("resultArea").hidden = false;
}

// ----- Utilities & UI -----

// Read all the things from the UI
function parse_ui() {
    
    // Sleep
    morning_energy_level = document.getElementById("batteryLevelStart").value;
    if (energy_before_sleep = null) {
        sleep_event.add_value( morning_energy_level );
    }
    else {
        sleep_event.add_value( morning_energy_level- energy_before_sleep);
    }
    current_energy_level = document.getElementById("batteryLevelEnd").value;
    
    // Events
    let event_names = document.getElementsByClassName("eventNames");
    let event_values = document.getElementsByClassName("eventValues");
    for (let i = 0; i < event_names.length; i++) {

        // If the event name is empty, don't add it
        if (event_names[i].value == "") {
            continue;
        }

        // If the event value is empty, add it as an auto event and we'll calculate it later
        if (event_values[i].value == "") {
            event_list.add_or_update_event(event_names[i].value, "auto");
        }
        else {
            event_list.add_or_update_event(event_names[i].value, event_values[i].value);
        }
    }
}

function set_ui_on_load() {
    
    // What was yesterday's energy level?
    if (energy_before_sleep !== null) {
        document.getElementById("yesterdaysEnergyMention").innerHTML = 
            "You ended yesterday at " + energy_before_sleep + "%.";
    }
    else {
        document.getElementById("yesterdaysEnergyMention").innerHTML = "";
    }

    // What events have been added before?
    let event_names = event_list.get_event_names();

    // Add the events to the UI for ease of access
    let previous_events = document.getElementById("previousEvents");
    previous_events.innerHTML = "";
    for (let i = 0; i < event_names.length; i++) {
        let option = document.createElement("option");
        option.value = event_names[i];
        previous_events.appendChild(option);
    }
}

// Update the UI with the current events (deprecated)
function update_ui() {
    
        // Sleep
        document.getElementById("batteryLevelStart").value = energy_before_sleep;
        document.getElementById("batteryLevelEnd").value = current_energy_level;
    
        if (energy_before_sleep !== null) {
            document.getElementById("batteryLevelStart").value = energy_before_sleep;
            document.getElementById("yesterdaysEnergyMention").innerHTML = 
                "Yesterday's energy level was " + energy_before_sleep + "%.";
        }
        else {
            document.getElementById("yesterdaysEnergyMention").innerHTML = 
                "Yesterday's energy level is unknown.";
        }

        // Events
        let event_names = document.getElementsByClassName("eventNames");
        let event_values = document.getElementsByClassName("eventValues");
        let events = event_list.get_events_by_value();
        for (let i = 0; i < event_names.length; i++) {
            event_names[i].value = events[i].name;
            event_values[i].value = events[i].estimate_value();
        }
}

// ----- Event Listeners -----
//document.getElementById("loadEventsBtn").addEventListener("click", load_events);
document.getElementById("saveEventsBtn").addEventListener("click", save_events);
document.getElementById("addEventBtn").addEventListener("click", add_event_row);
document.getElementById("clearEventsBtn").addEventListener("click", clear_all_events);
document.getElementById("calculateBtn").addEventListener("click", calculate_energy);

