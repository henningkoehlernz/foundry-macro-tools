/**
 * utility class for construction of Dialog requesting user input
 */
class InputDialog {

    /**
     * @param {string} title    dialog title
     * @param {string} buttons  map of button ids and labels (defaults to {ok: "Ok"})
     */
    constructor(title, buttons = {ok: "Ok"}) {
        this.data = {
            title: title,
            content: '',
            buttons: {}
        };
        for (let id in buttons)
            this.data.buttons[id] = { label: buttons[id] };
        this.ids = [];
    }

    /**
     * add an input to the dialog form
     * @param {string} label    description of expected input, e.g. "Attack Bonus"
     * @param {string} id       identifier for input, e.g. "ab"
     * @param {string} value    default value for input (defaults to "", use true/false for checkbox)
     * @param {string} type     html input type, e.g. "checkbox" (defaults to "text")
     */
    addInput(label, id, value = '', type = 'text') {
        let e_label = `<label for="${id}">${label}</label>`;
        if (type == 'checkbox') {
            this.data.content += `<p><input type="${type}" id="${id}" ${value ? ' checked' : ''}>${e_label}</p>`;
        }
        else
            this.data.content += `<p>${e_label}<input type="${type}" id="${id}" value="${value}"></p>`;
        this.ids.push(id);
    }

    /**
     * render dialog and evoke callback function when done
     * @param {Function} callback   function to be called when button is pressed
     *                              receives object mapping id values to user inputs and 'button' to the id of the button pressed
     */
    render(callback) {
        let getInput = (html, button) => {
            let input = { button: button };
            for (let id of this.ids) {
                let elem = html.find(`#${id}`)[0];
                if (elem.type == 'checkbox') {
                    input[id] = elem.checked;
                } else {
                    let val = elem.value;
                    input[id] = isNaN(val) ? val : parseInt(val);
                }
            }
            return input;
        };
        this.data.content = `<form>${this.data.content}</form><br>`;
        for (let id in this.data.buttons) {
            this.data.buttons[id].callback = (html) => {
                callback(getInput(html, id));
            }
        }
        new Dialog(this.data).render(true);
    }
}

// make globally available
globalThis.InputDialog = InputDialog;
