/**
 * rolls attacks and formats them into a table for chat message
 * provides highlighting of natural 1s and 20s, and confirmation rolls on threats
 */
class AttackTable {

    /**
     * create html code for an inline roll, with highlighting for natural 1s and 20s
     * @param {Roll} roll           evaluated Roll object
     * @param {boolean} highlight   whether to highlight natural 1s and 20s
     * @return {string}             html code showing roll as inline roll
     */
    static createInlineRoll(roll, highlight) {
        const a = document.createElement('a');
        a.classList.add("inline-roll", "inline-result");
        a.title = Roll.getFormula(roll.terms);
        a.dataset['roll'] = escape(JSON.stringify(roll));
        let rolled = roll.terms[0].total;
        if (highlight) {
            let style = rolled == 20 ? 'color:green' : rolled == 1 ? 'color:red' : '';
            a.innerHTML = `<i class="fas fa-dice-d20" style="${style}"></i> ${roll.total}`;
        } else
            a.innerHTML = `<i class="fas fa-dice-d20"></i> ${roll.total}`;
        return a.outerHTML;
    }

    /**
     * prefix attack formula with '1d20+' if needed
     * @param {string} attack   attack formula, e.g. '5+2' or '2d20kh+5'
     * @return {string}         attack formula prefixed with '1d20+' if not containing 'd20'
     */
    static prefixAttack(attack) {
        return attack.toString().includes('d20') ? attack : '1d20+' + attack;
    }

    /**
     * creates html for a button that applies given damage amount to character;
     * relies on PF1 item card mechanism
     * @param {int} damage      damage amount to apply
     * @return {string}         html for apply damage button
     */
    static applyDamageButton(damage) {
        return `<button data-action="applyDamage" data-value="${damage}" style="font-size: 12px;padding: 0px 0px;line-height:16px;width:42px">Apply</button>`;
    }

    /**
     * creates html for an inline roll and button that applies rolled damage amount to character;
     * @param {string} damage   damage roll formula, e.g. "1d8+5"
     * @param {boolean} invert  whether to invert the damage applied (to simulate healing)
     * @return {string}         html for inline roll and apply damage button
     */
    static damageRollAndButton(damage, invert=false) {
        let damageRoll = new Roll(damage).evaluate();
        return this.createInlineRoll(damageRoll, false)
            + this.applyDamageButton(invert ? -damageRoll.total : damageRoll.total);
    }

    /**
     * @param {string} header   optional table header, e.g. "Full Attack"
     */
    constructor(header='') {
        this._html = header == '' ? '' : `<tr><th colspan="4" style="text-align:center">${header}</th></tr>`;
    }

    /**
     * append a single attack to the attack table
     * @param {string} name             attack descriptor, e.g. "1st attack"
     * @param {string|int} attack       attack bonus or formula, e.g. "1d20+6+2" or "6+2" or 8
     * @param {string} damage           damage roll formula, e.g. "1d8+5"
     * @param {object} crit             critical hit options
     * @param {int} [crit.range]        minimum roll for threat, e.g. 19 for 19-20 threat range (defaults to 20)
     * @param {string} [crit.attack]    confirmation bonus or formula (defaults to attack parameter)
     * @param {string} [crit.damage]    extra damage on critical hit (defaults to damage parameter)
     */
    addAttack(name, attack, damage, crit={}) {
        // create html for attack roll - use Roll object to enable threat checking
        try {
            let attackRoll = new Roll(this.constructor.prefixAttack(attack)).evaluate();
            const sep = `</td><td>for</td><td style="text-align:right">`;
            this._html += `<tr><td>${name}</td><td>AC `
                + this.constructor.createInlineRoll(attackRoll, true) + sep
                + this.constructor.damageRollAndButton(damage) + '</td></tr>';
            // confirmation roll only shows on a threat
            if (attackRoll.terms[0].total >= (crit.range ?? 20)) {
                let confirmRoll = new Roll(this.constructor.prefixAttack(crit.attack ?? attack)).evaluate();
                this._html += '<tr><td>&nbsp;&nbsp;&nbsp;Confirm</td><td>AC '
                    + this.constructor.createInlineRoll(confirmRoll, true) + sep + "+"
                    + this.constructor.damageRollAndButton(crit.damage ?? damage) + '</td></tr>';
            }
        } catch(err) {
            console.log('Error in addAttack with parameters:', {
                name: name,
                attack: attack,
                damage: damage,
                crit: crit
            });
            throw new Error(err);
        }
    }

    /**
     * append a single combat maneuver to the attack table
     * @param {string} name     attack descriptor, e.g. "trip"
     * @param {string} attack   attack bonus or formula, e.g. "1d20+6+2" or "6+2"
     * @param {string} damage   damage roll formula, e.g. "1d8+5"
     */
    addManeuver(name, attack, damage) {
        // create html for attack roll - use Roll object to enable threat checking
        try {
            let attackRoll = new Roll(this.constructor.prefixAttack(attack)).evaluate();
            this._html += `<tr><td>${name}</td><td>CMD ` + this.constructor.createInlineRoll(attackRoll, true);
            if (damage) {
                let damageRoll = new Roll(damage).evaluate();
                this._html += `</td><td>for</td><td style="text-align:right">`
                    + this.constructor.createInlineRoll(damageRoll, false)
                    + this.constructor.applyDamageButton(damageRoll.total);
            }
            this._html += '</td></tr>';
        } catch(err) {
            console.log('Error in addManeuver with parameters:', {
                name: name,
                attack: attack,
                damage: damage
            });
            throw new Error(err);
        }
    }

    /**
     * append a custom row to the attack table
     * @param {string} text     note text (spans entire row)
     */
    addNote(text) {
        this._html += `<tr><td colspan="4">${text}</td></tr>`;
    }

    /**
     * @return {string}         html table containing attacks
     */
    getHtml() {
        // chat-card and card-buttons is needed to make PF1 applyDamage buttons work
        // see https://gitlab.com/Furyspark/foundryvtt-pathfinder1/-/blob/master/module/item/entity.js from chatListeners onwards
        return `<table class="pf1 chat-card card-buttons">${this._html}</table>`;
    }

    /**
     * send chat message containing attack table
     * @param {object} speaker  speaker object for message (defaults to selected token)
     */
    chat(speaker) {
        ChatMessage.create({
            user: game.user._id,
            speaker: speaker ?? ChatMessage.getSpeaker(),
            content: this.getHtml()
        });
    }

}

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
     * @param {string} label        description of expected input, e.g. "Attack Bonus"
     * @param {string} id           identifier for input, e.g. "ab"
     * @param {string} value        default value for input (defaults to "")
     * @param {string} type         html input type, e.g. "number" (defaults to "text")
     */
    addInput(label, id, value = '', type = 'text') {
        let e_label = `<label for="${id}">${label}</label>`;
        if (type == 'checkbox')
            this.data.content += `<p><input type="${type}" id="${id}" ${value ? ' checked' : ''}>${e_label}</p>`;
        else
            this.data.content += `<p>${e_label}<input type="${type}" id="${id}" value="${value}"></p>`;
        this.ids.push(id);
    }

    /**
     * add a checkbox to the dialog form
     * @param {string} label        description of expected input, e.g. "Hasted"
     * @param {string} id           identifier for input, e.g. "hasted"
     * @param {bool} checked        whether the checkbox is initially checked (defaults to false)
     */
    addCheckbox(label, id, checked = false) {
        this.addInput(label, id, checked, 'checkbox');
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
Hooks.once('ready', function () {
    globalThis.AttackTable = AttackTable;
    globalThis.InputDialog = InputDialog;
    console.log("Macro Tools | Ready");
});
