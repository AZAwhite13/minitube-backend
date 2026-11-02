import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendWelcomeEmail = async (email, name) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to MiniTube!",
        html: `
            <h1>Welcome to MiniTube, ${name}!</h1>
            <p>Your account has been created successfully.</p>
        `
    });
};  

export const verifyEmailConnection = async () => {
    return await transporter.verify();
};

export const sendCommentNotification = async (
    authorEmail,
    authorName,
    videoTitle,
    commenterName,
    commentText
) => {
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log("Comment notification simulation:", {
            authorEmail,
            videoTitle,
            commenterName,
            commentText
        });
        return;
    }

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: authorEmail,
        subject: "New comment on your MiniTube video!",
        html: `
            <h2>Hello, ${authorName}!</h2>
            <p>Someone commented on your video:</p>
            <h3>${videoTitle}</h3>
            <p><b>${commenterName}:</b> ${commentText}</p>
        `
    });
};