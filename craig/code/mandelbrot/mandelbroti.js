/**
 * @license Copyright (c) 2013,2014 Craig A. Struble
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived
 * from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @fileoverview A Mandelbrot set plotter using HTML5 canvases and
 * D3.js.
 * @author strubleca@yahoo.com (Craig Struble)
 */

/**
 * Extract an integer for an RGB hex string.
 *
 * Originally from http://thehomestarmy.com/s9y/index.php?/archives/971-Javascript-Color-Fader.html
 *
 * @param {string} clr the RGB string representing the color.
 * @param {number} component which RGB component to grab (1,2, or 3)
 * @return {number} an integer representation of the component
 */
function getHexComponent(clr, component) {
    var length = clr.length;

    switch(length) {
        // Single hex character per RGB component
        case 4:
        {
            clr = parseInt(clr.substring(component + 1, component + 2), 16);
            break; 
        }

        // Two hex characters per RGB component
        case 7:
        {
            clr = parseInt(clr.substring((component * 2) + 1, (component * 2) + 3), 16); 
            break;
        }

        // Unsupported RGB representation
        default:
        {
            alert("Invalid color: please enter a valid hex or rgb color.");
            break;
        }
    }
    return clr;
}

/**
 * Determine if a point is guaranteed to be in the Mandelbrot set.
 * This is an optimization for two large regions that are in the
 * Mandelbrot set.
 *
 * @param {number} x the x/real coordinate for a complex number.
 * @param {number} y the y/imaginary coordinate for a complex number.
 * @return {boolean} true whether the point is in the Mandelbrot set.
 */
function inMandelbrot(x, y) {
    var q = x*x - 0.5*x + 0.0625 + y*y;
    var inCardioid = (q*(q + (x - 0.25))) < y*y*0.25;
    var inP2Bulb = x*x+2*x+1+y*y < 0.0625;
    return inCardioid || inP2Bulb;
}

/**
/* Create a custom HTML5 DOM element for plotting the Mandelbrot set.
 * This uses concepts present in the D3.js demo at
 * http://bl.ocks.org/mbostock/1276463
 *
 * @param {Element} a selected DOM element storing this custom element
 */
function custom(selection) {
    // Custom element initialization using an anonymous function.
    selection.each( function() {
        // Create a canvas for the custom element
        var root = this,
            canvas = root.parentNode.appendChild(
                document.createElement("canvas")),
            context = canvas.getContext("2d");

        // Style and locate the custom element
        canvas.style.position = "absolute";
        canvas.style.top = root.offsetTop + "px";
        canvas.style.left = root.offsetLeft + "px";

        // Initialize the image data for the element.
        var cur_iter = 0;
        var mb_img = context.createImageData(mb_width,mb_height);
        var mb_data = mb_img.data;
        // Map each location, indexed linearly, to a complex
        // value and initialize its colors and state of being
        // in or out of the Mandelbrot set.
        var mb_grid = d3.range(mb_total).map(function(i) {
            var cx=i % mb_width,              // canvas x location
                cy=Math.floor(i / mb_width),  // canvas y location
                // Maps pixel locations to complex values
                x0=mb_xmin+(cx/(mb_width-1))*mb_xwidth,
                y0=mb_ymin+(cy/(mb_height-1))*mb_yheight,
                done=inMandelbrot(x0, y0),
                iter=done ? max_iterations : 0;

            // Initial color for the location
            var clr = color(iter);
            mb_data[i*4] = getHexComponent(clr, 0);
            mb_data[i*4 + 1] = getHexComponent(clr, 1);
            mb_data[i*4 + 2] = getHexComponent(clr, 2);
            mb_data[i*4 + 3] = 255;

            // Representation of a pixel
            return {
                cx: cx,       // canvas x location
                cy: cy,       // canvas y location
                x0: x0,       // initial complex value to be iterated
                y0: y0,       // initial complex value to be iterated
                x:  0,        // current iteration value
                y:  0,        // current iteration value
                iter: iter,   // which iteration is being evaluated
                done: done    // is the pixel in or out of the Mandelbrot set
            };
        });

        /**
         * Redraw the canvas, as long as the maximum number of iterations
         * hasn't been reached.
         *
         * @return whether or not the maximum number of iterations is passed
         */
        function redraw() {
          canvas.width = root.getAttribute("width");
          canvas.height = root.getAttribute("height");
          context.putImageData(mb_img, 0, 0);
          return cur_iter >= max_iterations;
        }

        /**
         * Evaluate an iteration of the Mandelbrot formula 
         *
         * @return whether or not the maximum number of iterations is passed
         */
        function iterate() {
            for (var i=0; i < mb_total; i++) {
                var pixel=mb_grid[i];
                // If the point is not already outside the Mandelbrot set.
                if (!pixel.done) {
                    var x=pixel.x,
                        y=pixel.y,
                        x2=x*x,
                        y2=y*y;
                    // If updated point has not yet escaped to infinity,
                    // update its color by increasing the point's iterations.
                    if ((x2 + y2) <= 4 && pixel.iter < max_iterations) {
                        // Update the iteration value and iteration.
                        var xtemp = x2 - y2 + pixel.x0;
                        pixel.y = 2*x*y + pixel.y0;
                        pixel.x = xtemp;
                        pixel.iter++;
                        // Update the color in the image data.
                        var clr = color(pixel.iter);
                        mb_data[i*4] = getHexComponent(clr, 0);
                        mb_data[i*4 + 1] = getHexComponent(clr, 1);
                        mb_data[i*4 + 2] = getHexComponent(clr, 2);
                        mb_data[i*4 + 3] = 255;
                    } else {
                        // No more iterations are necessary, because the
                        // point is not in the Mandelbrot set.
                        pixel.done = true;
                    }
                }
            }
            cur_iter++;
            return cur_iter >= max_iterations;
        }

        // Use D3.js to call redraw and iterate on a timer, allowing
        // refreshes to occur.
        d3.timer(redraw);
        d3.timer(iterate, 1000);
    });
}
   

//---------------------------- Main Script ---------------------------
// A D3 Mandebrot set visualizer
var mb_width=640;                  // width of the mandelbrot canvas
var mb_height=480;                 // height of the mandelbrot canvas
var mb_total=mb_width*mb_height;   // total number of pixels
var max_iterations=1000;           // maximum number of iterations

// Bounds of Mandelbrot region
var mb_xmax=1;
var mb_xmin=-2.5;
var mb_ymax=((mb_xmax - mb_xmin) * (mb_height/mb_width)) / 2;
var mb_ymin=-mb_ymax; // assumes centered around 0
var mb_xwidth=mb_xmax-mb_xmin;
var mb_yheight=mb_ymax-mb_ymin;

// Gradient of colors for plotting
var color = d3.scale.linear()
    .domain([0, max_iterations/100, max_iterations/10, max_iterations/3, max_iterations])
    .range(["blue", "green", "red", "yellow", "black"]);

// Create the custom element for the canvas. Select the element with the
// #viz id and add in the custom element with the proper width and height
var mb_canvas=d3.select("#viz")
    .append("custom:sketch")
    .attr("width", mb_width)
    .attr("height", mb_height)
    .call(custom);
