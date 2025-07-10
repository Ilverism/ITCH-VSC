// extension.ts


/**
 * -- Inline Tag Context Hider - VSC --
 * 
 * A Visual Studio Code extension to
 * collapse inline tags in the code
 * editor.
 * 
 * By default, only tags whose content
 * appears on a single line will be
 * collapsed, but this behavior can be
 * toggled to allow multiline tags.
 * 
 * This extension was created with the
 * intent of making content more 
 * human-readable by hiding extraneous
 * content when not being edited.
 * Specifically, it was made for a
 * visual novel engine that uses HTML,
 * and this extension allows inline
 * styling tags to be hidden
 * automatically.
 * 
 * Happy folding!
 */


/* Imports */
import * as vscode from 'vscode';
import { Fold } from './fold';
import { getCommentTester } from './commentconfig';


/* Initialize Variables */
let enabled = true;
let allowMultiline = false;
let allowCommentFolds = false;


/**
 * This is the main entry point for the extension.
 * It sets up event listeners and commands.
 * 
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {

    //React to file edits & editor changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(ev => {

            //Extension is enabled, document is active, apply decorations
            if (enabled && vscode.window.activeTextEditor?.document === ev.document)
                applyDecorations(vscode.window.activeTextEditor);

        }),
        vscode.window.onDidChangeTextEditorSelection(ev => {

            //Extension is enabled, text editor is active, apply decorations
            if (enabled && vscode.window.activeTextEditor === ev.textEditor)
                applyDecorations(ev.textEditor);

        }),
        vscode.window.onDidChangeActiveTextEditor(ed => {

            //Extension is enabled, apply decorations, otherwise clear them
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);
            
        }),
    );

    //COMMAND -- Toggle extension on/off
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.toggle', () => {

            //Toggle the enabled state
            enabled = !enabled;

            //Apply/Clear decorations based on the new state
            const ed = vscode.window.activeTextEditor;
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);
            
        })
    );

    //COMMAND -- Toggle multiline support
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.toggleMultiline', () => {

            //Toggle the allowMultiline state
            allowMultiline = !allowMultiline;

            //Apply/Clear decorations based on the current state
            const ed = vscode.window.activeTextEditor;
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);

        })
    );

    //COMMAND -- Toggle comment folds
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.toggleCommentFolds', () => {

            //Toggle the allowCommentFolds state
            allowCommentFolds = !allowCommentFolds;

            //Apply/Clear decorations based on the current state
            const ed = vscode.window.activeTextEditor;
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);
            
        })
    );

    //Initial pass
    if (vscode.window.activeTextEditor)
        applyDecorations(vscode.window.activeTextEditor);

}


/**
 * This function is called when the extension is deactivated.
 * It clears all decorations from the active text editor.
 */
export function deactivate() {

    clearDecorations(vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0]);
    
}


/**
 * Clear all decorations from the active text editor.
 * @param ed The active text editor to clear decorations from.
 */
function clearDecorations(ed: vscode.TextEditor) {

    for (const fold of Fold.foldsList) {
        ed.setDecorations(fold.tagDecoration, []);
        ed.setDecorations(fold.innerDecoration, []);
    }

}


/**
 * Apply decorations to the active text editor based on the defined fold patterns.
 * 
 * It scans the document text for patterns defined in the Fold class and
 * applies decorations accordingly.
 * 
 * @param editor The active text editor to apply decorations to.
 */
function applyDecorations(editor: vscode.TextEditor) {

    const docText = editor.document.getText();
    const selections = editor.selections;

    const commentTester = (allowCommentFolds ? undefined : getCommentTester());

    //Run every fold regex against the document text
    for (const fold of Fold.foldsList) {

        const tagRanges: vscode.Range[] = [];
        const innerRanges: vscode.Range[] = [];

        //Reset regex state before each full-file scan
        fold.regex.lastIndex = 0;
        let m: RegExpExecArray | null;

        while ((m = fold.regex.exec(docText))) {

            const fullStart = m.index;
            const fullEnd = fullStart + m[0].length;

            //Comment tester is defined, apply test
            if (commentTester) {

                const { line, blockOpen, blockClose } = commentTester;
                const startLine = editor.document.positionAt(fullStart).line;
                const ln = editor.document.lineAt(startLine).text;

                //Got single-line comment, skip
                if (line?.test(ln))
                    continue;

                //Got open-block comment...
                if (blockOpen && blockClose) {

                    const beforeStart = docText.slice(0, fullStart);
                    const openIdx  = beforeStart.lastIndexOf(blockOpen);
                    const closeIdx = beforeStart.lastIndexOf(blockClose);

                    //...Still inside a block comment, skip
                    if (openIdx > -1 && openIdx > closeIdx)
                        continue;
                    
                }

            }

            const openText = m[1];              //<-- First capture group
            const closeText = m[m.length - 1];  //<-- Last capture group

            const openStartIdx = fullStart;
            const openEndIdx = (openStartIdx + openText.length);
            const closeStartIdx = (fullEnd - closeText.length);

            const openRange = new vscode.Range(
                editor.document.positionAt(openStartIdx),
                editor.document.positionAt(openEndIdx)
            );
            const closeRange = new vscode.Range(
                editor.document.positionAt(closeStartIdx),
                editor.document.positionAt(fullEnd)
            );

            

            const blockRange = new vscode.Range(openRange.start, closeRange.end);

            //Multiline not allowed, skip multiline blocks
            if (!allowMultiline && blockRange.start.line !== blockRange.end.line)
                continue;


            //Editing this block, skip it
            const isBeingEdited = selections.some(sel => sel.intersection(blockRange));
            if (isBeingEdited)
                continue;


            //Add the ranges to the arrays
            tagRanges.push(openRange, closeRange);
            innerRanges.push(blockRange);

        }

        //Apply the decorations
        editor.setDecorations(fold.tagDecoration, tagRanges);
        editor.setDecorations(fold.innerDecoration, innerRanges);

    }
    
}