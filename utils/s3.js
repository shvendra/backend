import s3 from "../helper/uploads3.js";

export default async function uploadToS3(fileBuffer, key, mimetype) {
  return s3.upload({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: "private"
  }).promise();
}
