const ProcessBarForRating = (props) => {
  const { percentage } = props;
  const width = percentage ? `${percentage}%` : "0";
  return (
    <>
      <div className='my-2 py-1'>
        <div className='relative bg-[#e4e5e7] w-full h-2 rounded-full'>
          <div
            className={`h-2 absolute top-0 left-0 bg-yellow-500 rounded-full`}
            style={{ width: width }}
          ></div>
        </div>
      </div>
    </>
  );
};

export default ProcessBarForRating;
