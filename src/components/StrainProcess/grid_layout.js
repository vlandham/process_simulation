/**
 * @copyright 2018 Zymergen
 */
import * as d3 from 'd3';

/**
 * Grid layout
 * Given an array of data and a key to group the data by
 * this produces a set of points to cluster the groups around.
 * Written in the style of a d3-plugin.
 */
function gridLayout() {
  let width = 100;
  let height = 100;
  let key = 'x';
  let numCols = 20;
  let gridMap = {};

  const placement = {};

  /**
   * called internally to setup grid points.
   */
  function setupGrid(data) {
    const uniqKeys = d3
      .nest()
      .key(d => d[key])
      .rollup(values => values.length)
      .entries(data)
      .sort((a, b) => b.value - a.value);

    // reset gridMap
    gridMap = {};

    // Tweak layout if not enough values for
    // good looking columns
    // TODO: just based on visual apparance - not data
    if (uniqKeys.length < numCols * 2) {
      numCols /= 2;
    }

    const numRows = Math.ceil(uniqKeys.length / numCols);

    const xScale = d3
      .scalePoint()
      .range([0, width])
      .padding(0.05)
      .domain(d3.range(0, numCols, 1));

    // Tweak layout if not enough values for
    // good looking rows
    // TODO: just based on visual apparance - not data
    let scaleHeight = height;
    // if (numRows < 3) {
    //   scaleHeight = height / 2;
    // } else if (numRows > 8) {
    //   scaleHeight = height * 2.5;
    // }

    const yScale = d3
      .scalePoint()
      .range([0, scaleHeight])
      .padding(0.05)
      .domain(d3.range(0, numRows, 1));

    uniqKeys.forEach((d, i) => {
      const col = i % numCols;
      const row = Math.floor(i / numCols);
      gridMap[d.key] = {
        index: i,
        id: d.key,
        count: d.value,
        x: xScale(col),
        y: yScale(row),
        col,
        row,
      };
    });

    // function that pulls out coordinates from gridMap
    const grid = k => {
      return gridMap[k];
    };
    return grid;
  }

  /**
   * Given an array of data, augment the elements of that data with
   * `gridx` and `gridy` values. This indicates the centroid to move towards
   * for that individual data point.
   *
   * @param {Array} data Data array to modify
   */
  placement.arrange = function arrange(data) {
    const grid = setupGrid(data);
    data.forEach(d => {
      const gridPos = grid(d[key]);
      d.gridx = gridPos.x;
      d.gridy = gridPos.y;
    });

    return this;
  };

  /**
   * Getter for current grid
   * @returns {Array} array of grid points
   */
  placement.grid = function getGrid() {
    return Object.values(gridMap);
  };

  /**
   * Getter / Setter for key value to access data by
   * @param {String} _ New Key. If missing, returns current key.
   */
  placement.key = function setKey(_) {
    if (!arguments.length) {
      return key;
    }
    key = _;

    return placement;
  };

  /**
   * Getter / Setter for width to use
   * @param {String} _ New width. If missing, returns current width.
   */
  placement.width = function setWidth(_) {
    if (!arguments.length) {
      return width;
    }
    width = _;

    return placement;
  };

  /**
   * Getter / Setter for height to use
   * @param {String} _ New height. If missing, returns current height.
   */
  placement.height = function setHeight(_) {
    if (!arguments.length) {
      return height;
    }
    height = _;

    return placement;
  };

  /**
   * Getter / Setter for number of columns
   * @param {String} _ New number of coluns. If missing, returns current numCols.
   */
  placement.cols = function setCols(_) {
    if (!arguments.length) {
      return numCols;
    }
    numCols = _;

    return placement;
  };

  // Return placement function
  return placement;
}

export default gridLayout;
