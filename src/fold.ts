// fold.ts


/**
 * -- Inline Tag Context Hider - VSC --
 * 
 * Definition for the Fold class,
 * which represents a fold configuration
 * with a regex pattern.
 * 
 * Additional styling can be applied
 * to fold definitions.
 *
 * It is recommended to define Fold
 * instances in a separate file, such
 * as 'foldconfig.ts'. 
 * 
 * Fold instances will automatically
 * be added to a static list inside the
 * Fold class, so manually managing
 * fold instances should not be necessary
 * for regular usage.
 */


/* Imports */
import * as vscode from 'vscode';


/**
 * Represents a fold configuration with a regex pattern and color.
 * It creates a decoration type for the fold and manages a list of all folds.
 * 
 * The intended usage is to create instances of this class with specific regex
 * patterns and colors, which can then be applied to text in the editor.
 * 
 * @class Fold
 * @property {string} regex - The regex pattern to match for the fold.
 * @property {string} color - The color to use for the fold. (Defaults to a predefined color)
 */
export class Fold {


    //Constants
    static readonly FOLD_COLOR_DEFAULT = '#FFBB80FF';
    private static readonly TAG_DECORATION_BASE: vscode.DecorationRenderOptions = {
        textDecoration: 'none; display:none;',
        before: {
            contentText: '\u200B',
            textDecoration: 'none; font-size:0;',
            borderColor: `${Fold.FOLD_COLOR_DEFAULT}`,
        },
        after: {
            contentText: '|',
            color: Fold.FOLD_COLOR_DEFAULT,
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    };


    //Record list of all Fold instances
    static readonly foldsList: Fold[] = [];


    //Variable declarations
    readonly regex: RegExp;
    readonly tagDecoration: vscode.TextEditorDecorationType;
    readonly innerDecoration: vscode.TextEditorDecorationType;


    /**
     * Creates a new Fold instance with the specified regex pattern, color, and styling.
     * 
     * @param {string|RegExp} pattern - The regex pattern to match for the fold.
     * @param {string} [color=Fold.FOLD_COLOR_DEFAULT] - The color to use for the fold decoration.
     * @param {Object} [styling={}] - Additional styling options for the fold decoration.
     */
    constructor(pattern:string|RegExp, color:string=Fold.FOLD_COLOR_DEFAULT, styling:Object={}) {

        //Initialize Variables
        this.regex = pattern instanceof RegExp
            ? new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
            : new RegExp(pattern, 'gi');

        //Create the decoration type
        this.tagDecoration = vscode.window.createTextEditorDecorationType({
            ...Fold.TAG_DECORATION_BASE,
            color: color,
            before: {
                ...Fold.TAG_DECORATION_BASE.before,
                borderColor: color,
            },
            after: {
                ...Fold.TAG_DECORATION_BASE.after,
                color: color,
                ...styling,
            },
        });

        //Create inner decoration type
        this.innerDecoration = vscode.window.createTextEditorDecorationType({
            cursor: 'col-resize',
            color: color,
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            ...styling,
        });
        
        //Add to the list of folds
        Fold.foldsList.push(this);

    }


    /**
     * Clears all folds stored in the static list.
     */
    static clearFolds() {

        //Clear the list of folds
        Fold.foldsList.forEach(fold => {
            fold.tagDecoration.dispose();
            fold.innerDecoration.dispose();
        });

        Fold.foldsList.length = 0;
        
    }

}