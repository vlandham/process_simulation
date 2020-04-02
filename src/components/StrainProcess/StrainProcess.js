import React, { Component } from 'react';
import * as d3 from 'd3';
import addComputedProps from 'react-computed-props';

import gridLayout from './grid_layout';

import './StrainProcess.scss';

const getRandom = function(list) {
  return list[Math.floor(Math.random() * list.length)];
};

function drawEllipseWithQuatraticCurve(ctx, x, y, w, h, style, line) {
  const xe = x + w; // x-end
  const ye = y + h; // y-end
  const xm = x + w / 2; // x-middle
  const ym = y + h / 2; // y-middle

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, ym);
  ctx.quadraticCurveTo(x, y, xm, y);
  ctx.quadraticCurveTo(xe, y, xe, ym);
  ctx.quadraticCurveTo(xe, ye, xm, ye);
  ctx.quadraticCurveTo(x, ye, x, ym);
  if (style) ctx.strokeStyle = style;
  if (line) ctx.lineWidth = line;
  ctx.stroke();
  ctx.restore();
}

const FINAL_HTS = 30200;
// const FINAL_HTS = 1400;
const FAST_DESIGN = 7000;
let FAST_MODE = false;
let END_MODE = false;
let FAST_SPEED = 0.6;

const MAX_COMBI = 23;

const STRAIN_TYPES = {
  1: { id: 1, name: 'Type 1', color: '#E8871A' },
  2: { id: 2, name: 'Type 2', color: '#DA3390' },
  3: { id: 3, name: 'Type 3', color: '#5144D3' },
  4: { id: 4, name: 'Type 4', color: '#00C0C7' },
};

const COUNTS = {
  Phase1: 0,
  Phase2: 0,
  Phase3: 0,
  Start: 0,
  Combination: 0,
  Hit: 0,
  Improvement2: 0.0,
  Improvement1: 0.0,
};

function addHit(d) {
  const phenotype = d.index % 2 === 0 ? 'Improvement2' : 'Improvement1';

  if (END_MODE) {
    if (COUNTS['Improvement1'] !== 27.0) {
      COUNTS['Improvement1'] = 27.0;
    }
  } else {
    COUNTS[phenotype] += Math.round(Math.random() * 10) / 10;
    // COUNTS[phenotype] = COUNTS[phenotype].toFixed(2);
    COUNTS['Hit'] += 1;
  }
}

function circlePos(index, radius, cx, cy, totalLength) {
  index = index - 200;

  const frac = 360 / totalLength;

  const radians = index * (Math.PI / 180);
  // const radPush = index % 2 === 0 ? -5 : 5;
  return {
    x: cx + radius * Math.cos(radians * frac),
    y: cy + radius * Math.sin(radians * frac),
  };
}

function generateRandomNumber(min, max) {
  const highlightedNumber = Math.random() * (max - min) + min;

  return highlightedNumber;
}

function isPromoted(datum) {
  return datum.hts > 19.7;
}

function isHit(datum) {
  return Math.random() > 0.8;
}

function getType(datum) {
  let type = 1;
  if (Math.random() > 0.5) {
    type = 1;
  } else {
    const typeR = Math.round(generateRandomNumber(2, 4));
    type = typeR;
  }
  return type;
}
console.time('animation');

let ENDED = false;
function endAnimation() {
  if (!ENDED) {
    ENDED = true;
    END_MODE = true;
  }
}

function setupDatum(d) {
  d.hts = generateRandomNumber(0.0, 20.0);
  d.tank = generateRandomNumber(10.0, 20.0);
  d.built = Math.random() > 0.3;
  d.promoted = isPromoted(d);
  d.designed = Math.random() > 0.3;
  d.built = Math.random() > 0.3;
  d.hit = isHit(d);

  if (END_MODE) {
    d.built = false;
    d.promoted = false;
    d.designed = false;
    d.hit = false;
    d.tank = 0;
    d.hts = 0;
  }

  d.type = getType(d);
  return d;
}

function refreshDatum(d, gridScale) {
  const oldElapsed = d.elapsed;
  setupDatum(d);
  if (COUNTS['Phase2'] < FINAL_HTS) {
    addTrans(d, gridScale);
  } else {
    endAnimation();
    d.transEnd = true;
  }
  d.elapsed = oldElapsed;
}

function newDatum(index) {
  const strain = {
    index: index,
    elapsed: 0,
  };
  setupDatum(strain);

  strain.static = {};
  return strain;
}

function createData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push(newDatum(i));
  }
  return data;
}

const delayFunc = function(d) {
  // const pause = FAST_MODE ? 1 : 10;
  const pause = 10;
  return d.index * pause * Math.random();
};

const delayFuncNoRand = function(d) {
  // const pause = FAST_MODE ? 1 : 10;
  const pause = 10;
  return d.index * pause;
};
const DURATION = 1800;
const SHORT_DURATION = 200;
const LONG_DURATION = 4000;
const timeScale = d3
  .scaleLinear()
  .domain([0, DURATION])
  .range([0, 1])
  .clamp(true);
const shortTimeScale = d3
  .scaleLinear()
  .domain([0, SHORT_DURATION])
  .range([0, 1])
  .clamp(true);
const longTimeScale = d3
  .scaleLinear()
  .domain([0, LONG_DURATION])
  .range([0, 1])
  .clamp(true);

function endingTrans(combis, gridScale, plotHeight, rawTime) {
  const rowHeight = MAX_COMBI * 8;
  const rowPadding = 40;
  const t = timeScale;
  const combiTop = plotHeight - (rowHeight * 2 + rowPadding);
  const lastCombiIndex = combis.length - 1;
  const xPos = gridScale(4) + gridScale.bandwidth() / 2;
  combis.forEach((combi, i) => {
    // const oldElapsed = combi[0].elapsed;
    combi.forEach((d, j) => {
      d.combiX = d.x;
      d.combiY = d.y;
      d.combiColor = d.color;
      const color = i === lastCombiIndex ? STRAIN_TYPES[d.type].color : 'rgba(255,255,255,0)';
      d.trans = [
        {
          color: d3.interpolate(STRAIN_TYPES[d.type].color, color),
          delay: 1400,
          duration: t.domain()[1],
          timeScale: t,
          ease: d3.easeCubicInOut,
        },
        {
          id: 'ending',
          x: d3.interpolate(d.combiX, xPos),
          y: d3.interpolate(d.combiY, combiTop + j * 8),
          delay: 100,
          duration: t.domain()[1],
          timeScale: t,
          ease: d3.easeCubicInOut,
        },
      ];
      d.endingKeep = i === lastCombiIndex;
      d.transIndex = 0;
      d.transEnd = false;
      d.endNode = true;
      d.elapsed = rawTime;
      d.timeRatio = 1.0;
    });
  });
}

function combiTrans(strains, allCombi, gridScale, plotHeight) {
  // const t = FAST_MODE ? shortTimeScale : timeScale;
  const t = timeScale;
  const maxShown = 20;
  const rowHeight = MAX_COMBI * 8;
  const rowPadding = 40;
  const combiTop = plotHeight - (rowHeight * 2 + rowPadding);

  const index = (allCombi.length % maxShown) + 1;
  const row = index > maxShown / 2 ? 1 : 0;
  // const row = allCombi.length % 2;
  const xPos = (allCombi.length % 10) * 15;
  // const yPos = allCombi.length % 52;
  strains.forEach((d, i) => {
    d.trans = [
      {
        id: i === 0 ? 'combicon' : 'combicon-extra',
        x: d3.interpolate(d.gridx + gridScale(3), gridScale(4) + xPos),
        y: d3.interpolate(d.gridy, combiTop + i * 8 + row * (rowHeight + rowPadding)),
        delay: 500,
        duration: t.domain()[1],
        timeScale: t,
        ease: d3.easeCubicInOut,
      },
    ];
    d.transIndex = 0;
    d.transEnd = false;
    d.combicount = strains.length;
    d.timeRatio = FAST_MODE ? FAST_SPEED : 1.0;
  });
}

function addTrans(d, gridScale) {
  // const t = FAST_MODE ? shortTimeScale : timeScale;
  const t = timeScale;
  const tlong = longTimeScale;
  const tshort = shortTimeScale;

  d.trans = [
    {
      id: 'design',
      color: () => STRAIN_TYPES[d.type].color,
      y: () => d.design.y,
      x: () => d.design.x,
      r: d3.interpolate(0, 4),
      delay: d.index,
      duration: tshort.domain()[1],
      timeScale: tshort,
      ease: d3.easeCubicInOut,
    },
    {
      id: 'wait',
      delay: delayFuncNoRand(d),
      duration: t.domain()[1],
      timeScale: t,
      ease: d3.easeCubicInOut,
    },
    {
      id: 'build',
      y: d3.interpolate(d.design.y, d.gridy),
      x: d3.interpolate(d.design.x, d.gridx + gridScale(1)),
      delay: delayFunc(d),
      timeScale: tlong,
      duration: tlong.domain()[1],
      ease: d3.easeCubicInOut,
    },
  ];

  if (d.built) {
    d.trans.push({
      id: 'hts',
      x: d3.interpolate(d.gridx + gridScale(1), d.gridx + gridScale(2)),
      delay: delayFunc(d),
      timeScale: t,
      duration: t.domain()[1],
      ease: d3.easeCubicInOut,
    });
  } else {
    d.trans.push({
      color: d3.interpolate(STRAIN_TYPES[d.type].color, 'rgba(255,255,255,0)'),
      delay: delayFunc(d),
      timeScale: tshort,
      duration: tshort.domain()[1],
      ease: d3.easeCubicInOut,
    });
  }

  if (d.built && d.promoted) {
    d.trans.push({
      id: 'tank',
      x: d3.interpolate(d.gridx + gridScale(2), d.gridx + gridScale(3)),
      delay: delayFunc(d),
      timeScale: t,
      duration: t.domain()[1],
      ease: d3.easeCubicInOut,
    });
  } else if (d.built) {
    d.trans.push({
      color: d3.interpolate(STRAIN_TYPES[d.type].color, 'rgba(255,255,255,0)'),
      delay: delayFunc(d),
      timeScale: tshort,
      duration: tshort.domain()[1],
      ease: d3.easeCubicInOut,
    });
  }

  d.timeRatio = FAST_MODE ? FAST_SPEED : 1.0;
  d.transIndex = 0;
  d.elapsed = 0;
  d.transEnd = false;
}

function setupTrans(data, gridScale, plotHeight) {
  const grid = gridLayout()
    .width(gridScale.bandwidth())
    .height(plotHeight)
    .key('index');

  grid.arrange(data);

  const circleY = plotHeight / 2;
  const circleX = gridScale.bandwidth() / 2;

  const circleR = gridScale.bandwidth() / 2 - 20;

  const dataLength = data.length;

  data.forEach(function(d) {
    d.design = circlePos(d.index, circleR, circleX, circleY, dataLength);
    addTrans(d, gridScale);
  });
  return data;
}

function chartProps(props) {
  const { height, width } = props;

  const data = createData(1000);

  const padding = {
    top: 55,
    right: 10,
    bottom: 15,
    left: 40,
  };

  // scaling for retina displays
  let sizeScale = 1.0;
  if (window.devicePixelRatio) {
    sizeScale = window.devicePixelRatio;
  }

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const gridCount = 5;

  const gridScale = d3
    .scaleBand()
    .domain(d3.range(0, gridCount))
    .range([0, plotWidth])
    .paddingInner(0.2);

  setupTrans(data, gridScale, plotHeight);

  return {
    data,
    padding,
    plotWidth,
    plotHeight,
    sizeScale,
    gridScale,
  };
}

class StrainProcess extends Component {
  static defaultProps = {
    data: [],
    width: 1000,
    height: 1000 * (3 / 4),
  };

  /**
   * Update canvas when component mounts
   */
  componentDidMount() {
    this.setup();
    this.update();
  }

  /**
   * Update Canvas when component updates
   */
  componentDidUpdate() {
    this.update();
  }

  setup() {
    const { data } = this.props;
    this.data = data;
    const cSide = d3.select(this.side);
    const cBottom = d3.select(this.bottom);
    this.ended = false;
    this.sideG = cSide.append('g');
    this.bottomG = cBottom.append('g');
    this.yAxis = this.sideG.append('g').classed('y-axis', true);

    this.yAxisLabel = this.sideG
      .append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'middle');
    this.xAxis = this.bottomG.append('g').classed('x-axis', true);
    this.static = {
      build: [],
      hts: [],
      tank: [],
      types: {
        1: [],
        2: [],
        3: [],
        4: [],
      },
    };

    this.tanks = {};
    this.combis = [];

    this.rawTime = 0;
    this.endModeTicks = 0;
  }

  moveCircles(t) {
    const { gridScale, plotHeight } = this.props;
    const attributes = ['x', 'y', 'color', 'r'];

    this.rawTime = t;
    if (END_MODE) {
      this.endModeTicks += 1;
    }
    // let timeRatio = FAST_MODE ? 0.5 : 2.0;
    // if (END_MODE) {
    //   timeRatio = 1.0;
    // }
    // console.log('timeRatio', timeRatio);
    const that = this;
    const dataLength = this.data.length;
    const removeData = [];
    // this.data.forEach(function (d) {
    for (let dataIndex = 0; dataIndex < dataLength; dataIndex++) {
      const d = this.data[dataIndex];
      if (!d.timeRatio) {
        d.timeRatio = FAST_MODE ? FAST_SPEED : 1.0;
      }
      if (!d.transEnd) {
        const transT = t - d.elapsed * d.timeRatio;
        const transIndex = d.transIndex;
        const trans = d.trans[transIndex];
        const timeScale = trans.timeScale;
        const delayAmount = trans.delay * d.timeRatio;
        const time = trans.ease(timeScale(transT - delayAmount));

        attributes.forEach(attr => {
          if (trans[attr]) {
            d[attr] = trans[attr](time);
          }
        });

        if (time >= 1.0) {
          let sticky = Math.random() > 0.6;
          if (trans.id === 'ending' && d.endingKeep) {
            const pos = { x: d.x, y: d.y };
            that.static.types[d.type].push(pos);
          }

          if (trans.id === 'design') {
            COUNTS['Start'] += 1;
            if (!FAST_MODE && COUNTS['Start'] >= FAST_DESIGN) {
              FAST_MODE = true;
            }
          } else if (trans.id === 'build') {
            COUNTS['Phase1'] += 1;
            if (!d.static.build && sticky) {
              const pos = { x: d.x, y: d.y };
              that.static.build.push(pos);
              that.static.types[d.type].push(pos);
              d.static.build = true;
            }
          } else if (trans.id === 'hts') {
            COUNTS['Phase2'] += 1;
            // turn on fast mode

            if (!d.static.hts && sticky) {
              const pos = { x: d.x, y: d.y };
              that.static.hts.push(pos);
              that.static.types[d.type].push(pos);
              d.static.hts = true;
            }
          } else if (trans.id === 'tank') {
            COUNTS['Phase3'] += 1;
            if (d.hit) {
              console.log('hit');
              addHit(d);
            }
            const pos = { x: d.x, y: d.y };
            that.static.tank.push(pos);
            that.static.types[d.type].push(pos);
            if (END_MODE) {
              d.combi = true;
            }
          } else if (trans.id === 'combicon') {
            COUNTS['Combination'] += d.combicount * 10;
            // const pos = { x: d.x, y: d.y };
            // that.static.types[d.type].push(pos);
          }

          // !!!
          // d.elapsed += trans.duration + delayAmount;
          d.elapsed = t;
          d.transIndex += 1;
          if (d.endingKeep) {
            d.timeRatio = 1.0;
          } else {
            d.timeRatio = FAST_MODE ? FAST_SPEED : 1.0;
          }

          if (d.transIndex >= d.trans.length) {
            if (d.built && d.promoted && !d.combi) {
              d.transEnd = true;

              const combi = [Object.assign({}, d)];

              const tankKeys = Object.keys(that.tanks);
              if (tankKeys.length > 9) {
                const count = Math.min(Math.round(tankKeys.length / 10) + 1, MAX_COMBI);
                for (let i = 0; i < count; i++) {
                  const index = getRandom(tankKeys);
                  combi.push(Object.assign({}, that.tanks[index]));
                }
              }

              if (combi.length > 1 && !END_MODE) {
                combiTrans(combi, that.combis, gridScale, plotHeight);
                combi.forEach(c => {
                  c.combi = true;
                  c.elapsed = t;

                  that.data.push(c);
                });

                that.combis.push(combi);
              }
              that.tanks[d.index] = d;
            } else if (d.combi) {
              d.transEnd = true;
              // remove combi
              if (!d.endingKeep) {
                removeData.push(dataIndex);
              }
            } else {
              refreshDatum(d, gridScale);
            }
          }
        }
      }
    }

    this.data = this.data.filter(function(value, index) {
      return removeData.indexOf(index) === -1;
    });
    // });

    this.updateCanvas();
  }

  endAnimation() {
    const { gridScale, plotHeight } = this.props;
    if (!this.ended) {
      this.ended = true;
      console.timeEnd('animation');
      endingTrans(this.combis, gridScale, plotHeight, this.rawTime);
      console.log(this.combis);
      const that = this;
      this.combis.forEach(combi => {
        combi.forEach(d => {
          that.data.push(Object.assign({}, d));
        });
      });
      console.log('data');
      console.log(this.data);
    }
  }
  /**
   *
   */
  update() {
    const { padding } = this.props;

    this.sideG.attr('transform', `translate(${padding.left} ${padding.top})`);
    this.bottomG.attr('transform', `translate(${padding.left} 0)`);

    this.timer = d3.timer(this.moveCircles.bind(this));
    this.updateAxes();
  }

  updateCanvas() {
    const { sizeScale, gridScale, plotHeight, width, height, padding } = this.props;
    // console.log('data', this.data);

    // get context
    const ctx = this.canvas.getContext('2d');

    // Reset transform to ensure scale setting is appropriate.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(sizeScale, sizeScale);

    // draw main bars
    ctx.clearRect(0, 0, width, height);

    // have some padding
    ctx.translate(padding.left, padding.top);

    const cellWidth = gridScale.bandwidth();
    const cellHeight = cellWidth * 2;
    const cellX = 0;
    const cellY = plotHeight / 2 - cellHeight / 2;

    drawEllipseWithQuatraticCurve(ctx, cellX, cellY, cellWidth, cellHeight, '#D5D5D6', 5);

    const pi2 = Math.PI * 2;

    const radius = 4;
    const types = [1, 2, 3, 4];
    types.forEach(type => {
      ctx.beginPath();
      ctx.fillStyle = STRAIN_TYPES[type].color;
      this.static.types[type].forEach(pos => {
        ctx.moveTo(pos.x + radius, pos.y);
        ctx.arc(pos.x, pos.y, radius, 0, pi2);
      });

      ctx.fill();
    });

    if (this.endModeTicks < 20) {
      const combisSlice = this.combis.slice(Math.max(this.combis.length - 40, 0));
      const combisLength = combisSlice.length;

      for (let i = 0; i < combisLength; i++) {
        const combi = combisSlice[i];
        combi.forEach(d => {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, pi2, false);
          ctx.fillStyle = d.color;
          ctx.fill();
        });
      }
    }

    const dataLength = this.data.length;

    for (let i = 0; i < dataLength; i++) {
      const d = this.data[i];

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, pi2, false);
      ctx.fillStyle = d.color;
      ctx.fill();
    }

    if (END_MODE) {
      this.endAnimation();
    }
  }

  /**
   *
   */
  updateAxes() {
    const { gridScale, plotHeight } = this.props;

    const labels = ['Start', 'Phase1', 'Phase2', 'Phase3', 'Improvement', 'Combination'];

    const metrics = ['Improvement1', 'Improvement2'];

    // Legend
    const strainTypes = Object.keys(STRAIN_TYPES);
    const legendEnter = this.xAxis
      .selectAll('.key')
      .data(strainTypes)
      .enter();

    legendEnter
      .append('text')
      .classed('key', true)
      .text(d => STRAIN_TYPES[d].name)
      .attr('text-anchor', 'start')
      .attr('y', (d, i) => plotHeight - (strainTypes.length - (i - 1) * 30))
      .attr('x', 16);

    legendEnter
      .append('circle')
      .attr('fill', d => STRAIN_TYPES[d].color)
      .attr('r', 4)
      .attr('cx', 8)
      .attr('cy', (d, i) => plotHeight - (strainTypes.length - (i - 1) * 30) - 6);
    // Labels

    const enter = this.xAxis
      .selectAll('.label')
      .data(labels)
      .enter();
    enter
      .append('text')
      .classed('label', true)
      .text(d => d)
      .attr('text-anchor', 'start')
      .attr('y', (d, i) => (i > 4 ? -20 + (plotHeight / 2 - 20) : 30))
      .attr('x', (d, i) => (i > 4 ? gridScale(i - 1) : gridScale(i)));

    // Counts
    enter
      .append('text')
      .classed('count', true)
      .text(d => d)
      .attr('text-anchor', 'end')
      .attr('y', (d, i) => (i > 4 ? -20 + (plotHeight / 2 - 20) : 30))
      .attr('x', (d, i) =>
        i > 4 ? gridScale(i - 1) + gridScale.bandwidth() : gridScale(i) + gridScale.bandwidth(),
      );

    // Lines
    enter
      .append('line')
      .attr('x1', (d, i) => (i > 4 ? gridScale(i - 1) : gridScale(i)))
      .attr('x2', (d, i) =>
        i > 4 ? gridScale(i - 1) + gridScale.bandwidth() : gridScale(i) + gridScale.bandwidth(),
      )
      .attr('y1', (d, i) => (i > 4 ? -10 + (plotHeight / 2 - 20) : 40))
      .attr('y2', (d, i) => (i > 4 ? -10 + (plotHeight / 2 - 20) : 40))
      .attr('stroke-width', 2)
      .attr('stroke', '#222');

    // Metric Names
    const enterMetric = this.xAxis
      .selectAll('.metric')
      .data(metrics)
      .enter();
    enterMetric
      .append('text')
      .classed('metric', true)
      .text(d => `${d}:`)
      .attr('text-anchor', 'start')
      .attr('y', (d, i) => i * 30 + 70)
      .attr('x', gridScale(4));

    // Metric Values
    const enterMetricValue = this.xAxis
      .selectAll('.metric-value')
      .data(metrics)
      .enter();
    enterMetricValue
      .append('text')
      .classed('metric metric-value', true)
      .text(d => `${COUNTS[d].toFixed(2)}%`)
      .attr('text-anchor', 'end')
      .attr('y', (d, i) => i * 30 + 70)
      .attr('x', gridScale(4) + gridScale.bandwidth());

    const that = this;
    const countKeys = Object.keys(COUNTS);
    const updateTicker = function() {
      that.xAxis
        .selectAll('.count')
        .text((d, i) => (countKeys.includes(d) ? `${COUNTS[labels[i]]}` : ''));
      that.xAxis.selectAll('.metric-value').text(d => `${COUNTS[d].toFixed(2)}%`);
    };
    d3.timer(updateTicker);
  }

  /**
   * Render the chart
   */
  render() {
    const { sizeScale, width, height, padding } = this.props;

    let canvasStyle = {
      width: width,
      height: height,
    };

    return (
      <div className="StrainProcess" onClick={this.handleClick} style={{ height: height }}>
        <svg
          className="chart-side"
          ref={node => {
            this.side = node;
          }}
          width={padding.left}
          height={height}
        />
        <svg
          className="chart-bottom"
          ref={node => {
            this.bottom = node;
          }}
          width={width}
          height={height}
        />

        <canvas
          className="chart"
          ref={node => {
            this.canvas = node;
          }}
          style={canvasStyle}
          width={width * sizeScale}
          height={height * sizeScale}
        />
      </div>
    );
  }
}

export default addComputedProps(chartProps)(StrainProcess);
