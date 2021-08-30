export var interval_create = duration => {
  var previousTime = 0;
  var time = duration;

  return (dt, condition = true) => {
    time += dt;

    if (time - previousTime > duration) {
      if (condition) previousTime = time;
      return condition;
    }
  };
};
