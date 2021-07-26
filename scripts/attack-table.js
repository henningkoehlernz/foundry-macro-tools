/**
 * rolls attacks and formats them into a table for chat message
 * provides highlighting of natural 1s and 20s, and confirmation rolls on threats
 */
class AttackTable {

    /**
     * create html code for an inline roll, with highlighting for natural 1s and 20s
     * @param {Roll} roll       evaluated Roll object
     * @return {string}         html code showing roll as inline roll
     */
    static createInlineRoll(roll) {
        const a = document.createElement('a');
        a.classList.add("inline-roll", "inline-result");
        a.title = Roll.getFormula(roll.terms);
        a.dataset['roll'] = escape(JSON.stringify(roll));
        let rolled = roll.terms[0].total;
        let style = rolled == 20 ? 'color:green' : rolled == 1 ? 'color:red' : '';
        a.innerHTML = `<i class="fas fa-dice-d20" style="${style}"></i> ${roll.total}`;
        return a.outerHTML;
    }

    /**
     * @param {string} header   optional table header, e.g. "Full Attack"
     */
    constructor(header='') {
        this._html = header == '' ? '' : `<tr><th colspan="4" style="text-align:center">${header}</th></tr>`;
    }

    /**
     * append a single attack to the attack table
     * @param {string} name     attack descriptor, e.g. "1st attack"
     * @param {string} attack   attack bonus or formula, e.g. "1d20+6+2" or "6+2"
     * @param {string} damage   damage roll formula, e.g. "1d8+5" or "[[1d8+5]]+[[1d6]]"
     * @param {object} crit     critical hit options
     * @param {int} [crit.range]    minimum roll for threat, e.g. 19 for 19-20 threat range (defaults to 20)
     * @param {int} [crit.attack]   confirmation bonus or formula (defaults to attack parameter)
     * @param {int} [crit.damage]   extra damage on critical hit (defaults to damage parameter)
     */
    addAttack(name, attack, damage, crit={}) {
        // fix attack and damage formulas
        if (!attack.toString().includes('d20'))
            attack = '1d20+' + attack;
        if (!damage.startsWith('['))
            damage = `[[${damage}]]`;
        // create html for attack roll - use Roll object to enable threat checking
        try {
            let attackRoll = new Roll(attack).evaluate();
            const sep = `</td><td>for</td><td style="text-align:right">`;
            this._html += `<tr><td>${name}</td><td>AC `
                + AttackTable.createInlineRoll(attackRoll) + sep + damage + '</td></tr>';
            // confirmation roll only shows on a threat
            if (attackRoll.terms[0].total >= (crit.range ?? 20)) {
                let confirmRoll = new Roll(crit.attack === undefined ? attack : '1d20+' + crit.attack).evaluate();
                this._html += '<tr><td>&nbsp;&nbsp;&nbsp;Confirm</td><td>AC '
                    + AttackTable.createInlineRoll(confirmRoll) + sep + `+${crit.damage ?? damage}</td></tr>`;
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
     * @return {string}         html table containing attacks
     */
    getHtml() {
        return `<table>${this._html}</table>`;
    }

    /**
     * send chat message containing attack table
     */
    chat() {
        ChatMessage.create({
            user: game.user._id,
            speaker: ChatMessage.getSpeaker({token: actor}),
            content: this.getHtml()
        });
    }

}

// make globally available
globalThis.AttackTable = AttackTable;
