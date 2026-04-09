const RESUME_PHOTO_TYPE = 7;
const RESUME_PHOTO_DATA = 251;

function markResumePixel(simulation, index) {
  simulation.data[index] = RESUME_PHOTO_DATA;
}

function isVisibleResumePixel(simulation, index) {
  return (
    simulation.types[index] === RESUME_PHOTO_TYPE &&
    simulation.data[index] === RESUME_PHOTO_DATA &&
    simulation.photoColors[index] !== 0
  );
}

export { isVisibleResumePixel, markResumePixel };
